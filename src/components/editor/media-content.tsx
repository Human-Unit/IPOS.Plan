"use client";
import Image from "next/image";
import { ExternalLink, Link2, ImageIcon } from "lucide-react";
import { webUrl, type Block } from "@/lib/schema/plan";
import { SelectableBlock } from "./selectable-block";

function sourceLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function ReferenceContent({ block }: { block: Block }) {
  const {
    url = "",
    title = "",
    note = "",
  } = block.props as Record<string, string>;
  const valid = webUrl.safeParse(url).success;
  const source = valid ? sourceLabel(url) : "";

  return (
    <SelectableBlock
      id={block.id!}
      label={`Референс: ${title || "Без названия"}`}
      className="brief-reference"
    >
      <span className="brief-reference-icon" aria-hidden="true">
        <Link2 size={14} />
      </span>
      <div className="brief-reference-content">
        <span className="brief-reference-source">{source || "Референс"}</span>
        {valid ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
          >
            <span>{title || url}</span>
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        ) : (
          <strong>{title || "Укажите ссылку в свойствах"}</strong>
        )}
        {note && <p>{note}</p>}
      </div>
    </SelectableBlock>
  );
}

export function ImageContent({ block }: { block: Block }) {
  const { url = "", caption = "" } = block.props as Record<string, string>;
  return (
    <SelectableBlock
      id={block.id!}
      label={`Изображение: ${caption || "Без подписи"}`}
      className="brief-image"
    >
      <figure>
        {webUrl.safeParse(url).success ? (
          <Image
            unoptimized
            src={url}
            width={1200}
            height={1600}
            alt={caption || "Изображение контент-плана"}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="image-placeholder">
            <ImageIcon aria-hidden="true" />
            <span>
              {url
                ? "Укажите корректный URL изображения"
                : "Изображение по ссылке"}
            </span>
          </div>
        )}
        {caption && <figcaption>{caption}</figcaption>}
      </figure>
    </SelectableBlock>
  );
}
