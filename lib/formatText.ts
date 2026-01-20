export function formatText(text: string): string {
  if (!text) return "";

  let html = text;

  // Escape HTML
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headings
  html = html.replace(/^## (.*)$/gm, "<h3>$1</h3>");

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Underline
  html = html.replace(/__(.*?)__/g, "<u>$1</u>");

  // Lists
  html = html.replace(/^\d+\.\s+(.*)$/gm, "<li>$1</li>");
  html = html.replace(/^- (.*)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");

  // Paragraphs
  html = html.replace(/\n\s*\n/g, "</p><p>");

  return `<p>${html}</p>`;
}
