import React from "react";

const escapedAllowedTagPattern =
  /&lt;(\/?(?:p|div|br|strong|b|em|i|u|ul|ol|li|a|span)(?:\s[^>]*)?)&gt;/gi;

function normalizeDescription(text: string) {
  return text
    .replace(escapedAllowedTagPattern, "<$1>")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function descriptionPlainText(text: string) {
  return normalizeDescription(text)
    .replace(/<\/br>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inline(text: string, key = "text"): React.ReactNode[] {
  const parts = text.split(/(<\/?(?:strong|b|em|i|u|span|a)(?:\s[^>]*)?>)/gi);
  const output: React.ReactNode[] = [];
  const stack: Array<{
    tag: string;
    children: React.ReactNode[];
    color?: string;
    href?: string;
    key: string;
  }> = [];

  const push = (node: React.ReactNode) => {
    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(node);
    else output.push(node);
  };

  parts.forEach((part, index) => {
    if (!part) return;

    const close = part.match(/^<\/(strong|b|em|i|u|span|a)>$/i);
    const open = part.match(/^<(strong|b|em|i|u|span|a)([^>]*)>$/i);

    if (close) {
      const current = stack.pop();
      if (!current) {
        push(part);
        return;
      }

      const tag = current.tag === "b" ? "strong" : current.tag === "i" ? "em" : current.tag;
      const props =
        tag === "span" && current.color
          ? { style: { color: current.color } }
          : tag === "a" && current.href
            ? { href: current.href, target: "_blank", rel: "noreferrer" }
            : {};

      push(React.createElement(tag, { ...props, key: current.key }, current.children));
      return;
    }

    if (open) {
      const attributes = open[2];
      const color = attributes.match(
        /color\s*:\s*(#[0-9a-f]{3,8}|rgb\([\d\s,.%]+\)|hsl\([\d\s,.%]+\)|[a-z]+)/i,
      )?.[1];
      const href = attributes.match(/href=["'](https?:\/\/[^"']+|mailto:[^"']+)["']/i)?.[1];

      stack.push({
        tag: open[1].toLowerCase(),
        children: [],
        color,
        href,
        key: `${key}-${index}`,
      });
      return;
    }

    push(part);
  });

  while (stack.length) push(stack.pop()!.children);

  return output;
}

function inlineWithBreaks(text: string, key: string): React.ReactNode[] {
  const lines = text.split(/\n/);
  return lines.flatMap((line, index) => [
    ...(index > 0 ? [<br key={`${key}-br-${index}`} />] : []),
    ...inline(line, `${key}-${index}`),
  ]);
}

function PlainDescription({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  const bullets: string[] = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`} className="list-disc space-y-1 pl-5">
        {bullets.splice(0).map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>,
    );
  };

  text.split(/\r?\n/).forEach((row) => {
    const bullet = row.match(/^\s*[-*]\s+(.+)/);
    if (bullet) {
      bullets.push(bullet[1]);
      return;
    }

    flushBullets();
    if (row.trim()) {
      nodes.push(
        <p key={`p-${nodes.length}`} className="leading-relaxed">
          {row}
        </p>,
      );
    }
  });

  flushBullets();

  return <div className="space-y-3">{nodes}</div>;
}

export default function FormattedDescription({ text }: { text: string }) {
  const normalized = normalizeDescription(text).replace(/<\/br>/gi, "");

  if (!/<[a-z][\s\S]*>/i.test(normalized)) {
    return <PlainDescription text={normalized} />;
  }

  const blocks = normalized
    .replace(/<div[^>]*>/gi, "<p>")
    .replace(/<\/div>/gi, "</p>")
    .replace(/<br\s*\/?>/gi, "\n")
    .split(/(<\/?(?:p|ul|ol|li)[^>]*>)/i);

  const nodes: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let paragraph = "";

  const flushParagraph = () => {
    if (paragraph.trim()) {
      nodes.push(
        <p key={`p-${nodes.length}`} className="leading-relaxed">
          {inlineWithBreaks(paragraph, `p-${nodes.length}`)}
        </p>,
      );
    }
    paragraph = "";
  };

  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    nodes.push(
      <Tag
        key={`l-${nodes.length}`}
        className={list.ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}
      >
        {list.items.map((item, index) => (
          <li key={index}>{inlineWithBreaks(item, `l-${index}`)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };

  for (const token of blocks) {
    if (/^<p/i.test(token)) {
      flushList();
      flushParagraph();
    } else if (/^<\/(?:p|div)/i.test(token)) {
      flushParagraph();
    } else if (/^<(ul|ol)/i.test(token)) {
      flushParagraph();
      list = { ordered: /^<ol/i.test(token), items: [] };
    } else if (/^<\/([uo]l)/i.test(token)) {
      flushList();
    } else if (/^<li/i.test(token)) {
      paragraph = "";
    } else if (/^<\/li/i.test(token)) {
      if (list) {
        list.items.push(paragraph);
        paragraph = "";
      }
    } else {
      paragraph += token;
    }
  }

  flushParagraph();
  flushList();

  return <div className="space-y-3">{nodes}</div>;
}
