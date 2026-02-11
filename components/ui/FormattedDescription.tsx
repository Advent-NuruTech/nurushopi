"use client";

import React from "react";

type Block =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

function parseDescription(text: string): Block[] {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];

  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];

  const flushParagraph = () => {
    const content = paragraphBuffer.join(" ").trim();
    if (content) blocks.push({ type: "p", text: content });
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (listBuffer.length) blocks.push({ type: "ul", items: listBuffer });
    listBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const isBullet = line.startsWith("- ") || line.startsWith("* ");
    if (isBullet) {
      flushParagraph();
      listBuffer.push(line.slice(2).trim());
      continue;
    }

    flushList();
    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

export default function FormattedDescription({ text }: { text: string }) {
  const blocks = parseDescription(text);

  return (
    <div className="space-y-3">
      {blocks.map((block, idx) => {
        if (block.type === "ul") {
          return (
            <ul key={`ul-${idx}`} className="list-disc pl-5 space-y-1">
              {block.items.map((item, i) => (
                <li key={`li-${idx}-${i}`}>{item}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`p-${idx}`} className="leading-relaxed">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
