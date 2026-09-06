"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Bold, Italic, Link, List, ListOrdered, Underline } from "lucide-react";

type Props = { value: string; onChange: (value: string) => void; placeholder?: string; disabled?: boolean; maxLength?: number };
const allowedTags = new Set(["P", "DIV", "BR", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "A", "SPAN"]);
const safeColor = (value: string) => /^(#[0-9a-f]{3,8}|rgb\([\d\s,.%]+\)|hsl\([\d\s,.%]+\)|[a-z]+)$/i.test(value.trim()) ? value.trim() : "";

function cleanHtml(html: string) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const clean = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const element = node as HTMLElement, tag = element.tagName, children = Array.from(element.childNodes).map(clean).join("");
    if (!allowedTags.has(tag)) return children;
    if (tag === "A") { const href = element.getAttribute("href") ?? ""; return /^https?:\/\//i.test(href) || href.startsWith("mailto:") ? `<a href="${href.replace(/\"/g, "")}">${children}</a>` : children; }
    if (tag === "SPAN") { const color = safeColor(element.style.color); return color ? `<span style="color:${color}">${children}</span>` : children; }
    const normalized = tag === "B" ? "strong" : tag === "I" ? "em" : tag.toLowerCase();
    return `<${normalized}>${children}</${normalized}>`;
  };
  return Array.from(parsed.body.childNodes).map(clean).join("").replace(/(<br>){3,}/g, "<br><br>");
}

export function richTextToPlainText(value: string) {
  if (typeof DOMParser === "undefined") return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return new DOMParser().parseFromString(value, "text/html").body.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

export default function RichTextEditor({ value, onChange, placeholder, disabled = false, maxLength = 5000 }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const editor = editorRef.current; if (editor && editor.innerHTML !== value && document.activeElement !== editor) editor.innerHTML = value; }, [value]);
  const emit = () => { const next = cleanHtml(editorRef.current?.innerHTML ?? ""); if (next.length <= maxLength) onChange(next); };
  const command = (name: string, argument?: string) => { editorRef.current?.focus(); document.execCommand(name, false, argument); emit(); };
  const button = (label: string, icon: ReactNode, action: () => void) => <button type="button" title={label} aria-label={label} onMouseDown={(event) => event.preventDefault()} onClick={action} disabled={disabled} className="rounded p-2 text-slate-600 hover:bg-[#EFFCF3] hover:text-[#006B2C] disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-700">{icon}</button>;
  return <div className="overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-[#009933] focus-within:ring-2 focus-within:ring-[#B8F5C8] dark:border-slate-600 dark:bg-slate-700">
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 p-1.5 dark:border-slate-600">
      {button("Bold", <Bold size={17} />, () => command("bold"))}{button("Italic", <Italic size={17} />, () => command("italic"))}{button("Underline", <Underline size={17} />, () => command("underline"))}{button("Bulleted list", <List size={17} />, () => command("insertUnorderedList"))}{button("Numbered list", <ListOrdered size={17} />, () => command("insertOrderedList"))}{button("Add link", <Link size={17} />, () => { const url = window.prompt("Link URL (https://...)"); if (url) command("createLink", url); })}
      <label className="ml-1 flex cursor-pointer items-center gap-1 rounded px-2 text-xs font-medium text-slate-600 hover:bg-[#EFFCF3] dark:text-slate-300">Text colour <input aria-label="Text colour" type="color" disabled={disabled} className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0" onChange={(event) => command("foreColor", event.target.value)} /></label>
    </div>
    <div ref={editorRef} contentEditable={!disabled} suppressContentEditableWarning role="textbox" aria-multiline="true" data-placeholder={placeholder} onInput={emit} onPaste={(event) => { const html = event.clipboardData.getData("text/html"); if (!html) return; event.preventDefault(); document.execCommand("insertHTML", false, cleanHtml(html)); emit(); }} className="min-h-44 p-3 leading-relaxed text-slate-900 outline-none empty:before:pointer-events-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 dark:text-slate-100" />
    <p className="border-t border-slate-100 px-3 py-1.5 text-right text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">{richTextToPlainText(value).length} characters · Paste from Google Docs to keep bold, lists and colours</p>
  </div>;
}
