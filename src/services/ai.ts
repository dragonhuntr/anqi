export async function generateQuestions(content: string, options = {}) {
  const response = await fetch('/api/generate-questions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
      options,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate questions');
  }

  return response.json();
}