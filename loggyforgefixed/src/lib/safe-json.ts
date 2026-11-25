/**
 * Reads a fetch Response as JSON without throwing when the body is empty or not JSON
 * (for example a platform 500 page). Returns a readable `error` instead of the browser's
 * "Unexpected end of JSON input".
 */
export async function readJson(response: Response): Promise<any> {
  const text = await response.text();
  const fallback = `Server error (${response.status}). Please try again in a moment.`;
  if (!text) return response.ok ? {} : { error: fallback };
  try {
    return JSON.parse(text);
  } catch {
    return { error: fallback };
  }
}
