"use client";
import Image from "next/image";
import { Link2, ImageIcon } from "lucide-react";
import { webUrl, type Block } from "@/lib/schema/plan";
import { SelectableBlock } from "./selectable-block";

export function ReferenceContent({ block }: { block: Block }) {
  const {
    url = "",
    title = "",
    note = "",
  } = block.props as Record<string, string>;
  return (
    <SelectableBlock
      id={block.id!}
      label={`Референс: ${title || "Без названия"}`}
      className="brief-reference"
    >
      <span className="brief-label">
        <Link2 size={14} aria-hidden="true" /> Референс
      </span>
      {webUrl.safeParse(url).success ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
        >
          {title || url}
        </a>
      ) : (
        <strong>{title || "Укажите ссылку в свойствах"}</strong>
      )}
      {note && <p>{note}</p>}
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
