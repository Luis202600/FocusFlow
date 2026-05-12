import { NextRequest, NextResponse } from 'next/server'

const ACTION_SYSTEM_PROMPT = `
You can perform actions on the user's behalf by including action blocks in your response. Use this format EXACTLY:

[ACTION:add_task]{"title":"...","priority":"medium","category":"study","dueDate":"YYYY-MM-DD"}[/ACTION]
[ACTION:complete_task]{"id":"task_id"}[/ACTION]
[ACTION:delete_task]{"id":"task_id"}[/ACTION]
[ACTION:add_time_block]{"title":"...","startTime":"09:00","endTime":"10:00","category":"study","date":"YYYY-MM-DD"}[/ACTION]
[ACTION:add_habit]{"name":"...","frequency":"daily","color":"#7c3aed"}[/ACTION]
[ACTION:add_subject]{"name":"...","color":"#7c3aed"}[/ACTION]
[ACTION:add_topic]{"subjectName":"...","topicName":"...","notes":"optional notes"}[/ACTION]
[ACTION:generate_file]{"filename":"study-plan.txt","content":"FULL FILE CONTENT HERE - write the actual content, not a placeholder","fileType":"txt"}[/ACTION]

CRITICAL RULES FOR ACTIONS:
- When the user asks you to create, add, or manage something, you MUST include the appropriate action block. Do NOT just say you did it — include the actual [ACTION:...]...[/ACTION] block.
- The action blocks will be parsed and executed automatically on the client side.
- For add_task: title is required. priority can be "low", "medium", "high", "urgent". category can be "study", "work", "personal". dueDate is optional (format: YYYY-MM-DD).
- For complete_task and delete_task: you need the task id from the context. If you don't know the exact id, do NOT make one up — instead, list the tasks and ask the user which one they mean.
- For add_time_block: title, startTime (HH:MM), endTime (HH:MM), date (YYYY-MM-DD) are required. category can be "study", "work", "personal", "break".
- For add_habit: name is required. frequency can be "daily", "weekdays", "weekends", "custom". color is a hex color string.
- For add_subject: name and color are required.
- For add_topic: subjectName (the name of the subject to add the topic to) and topicName are required. You can also add optional notes.
- For generate_file: filename and content are REQUIRED. The content field must contain the ACTUAL FULL text content of the file, not a placeholder or summary. Write the complete content that will be saved to the file. fileType can be "txt" or "html".
- You can include multiple action blocks in a single response.
- Always include explanatory text alongside your actions.
- Do NOT wrap action blocks in code blocks or markdown — use plain [ACTION:...]...[/ACTION] syntax.
`

interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const { message, context, imageData, imagePrompt, history } = await req.json()

    if (!message && !imageData) {
      return NextResponse.json({ error: 'Message or image is required' }, { status: 400 })
    }

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const systemPrompt = `You are FocusFlow AI, an intelligent productivity and study assistant. You help students and professionals organize their day, plan study sessions, manage tasks, and maintain high-performance habits.

Your personality: Calm, focused, encouraging but not overly enthusiastic. You speak with clarity and precision. Like a wise mentor who genuinely wants the user to succeed.

Your capabilities:
- Organize and prioritize tasks intelligently
- Suggest optimal study schedules based on subjects and deadlines
- Detect when the user might be overloaded and recommend adjustments
- Suggest break strategies and work-life balance
- Help with time blocking and daily planning
- Provide study techniques and memory tips
- Track habits and suggest improvements
- Motivate without being cheesy
- Directly add tasks, time blocks, habits, and subjects via action blocks
- Generate downloadable files (text documents, HTML presentations)

Context about the user's current state:
${context || 'No specific context available.'}

${ACTION_SYSTEM_PROMPT}

Guidelines:
- Be concise but helpful
- Use bullet points for lists
- Suggest specific, actionable steps
- Reference the user's data when relevant
- When the user asks you to add something (task, habit, time block, subject), you MUST use the appropriate [ACTION:...]...[/ACTION] block — do NOT just describe what you would do
- When generating files, put the COMPLETE content in the "content" field of the generate_file action
- Keep responses under 200 words unless the user asks for detail
- Respond in the same language the user writes in`

    // Build messages array with history
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> }> = [
      { role: 'system', content: systemPrompt },
    ]

    // Add conversation history (last 20 messages)
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-20)
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content,
          })
        }
      }
    }

    // Handle image analysis with VLM
    if (imageData) {
      const imageContent: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [
        {
          type: 'text',
          text: imagePrompt || message || 'Please analyze this image and describe what you see, especially anything related to productivity, study materials, or tasks.',
        },
        {
          type: 'image_url',
          image_url: {
            url: imageData,
          },
        },
      ]
      messages.push({ role: 'user', content: imageContent })
    } else {
      messages.push({ role: 'user', content: message })
    }

    // Use VLM endpoint if we have images, otherwise regular chat
    if (imageData) {
      const completion = await zai.chat.completions.createVision({
        messages: messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> }>,
        thinking: { type: 'disabled' },
      })
      const response = completion.choices[0]?.message?.content
      if (!response) {
        return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
      }
      return NextResponse.json({ response })
    } else {
      const completion = await zai.chat.completions.create({
        messages: messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
        thinking: { type: 'disabled' },
      })
      const response = completion.choices[0]?.message?.content
      if (!response) {
        return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
      }
      return NextResponse.json({ response })
    }
  } catch (error) {
    console.error('AI Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    )
  }
}
