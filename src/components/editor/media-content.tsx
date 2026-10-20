"use client";
import Image from "next/image";
import { useState } from "react";
import {
  Link2,
  ImageIcon,
  ArrowUpRight,
  Play,
  Video,
  Music2,
} from "lucide-react";
import { webUrl, type Block } from "@/lib/schema/plan";
import { SelectableBlock } from "./selectable-block";

export function ReferenceContent({ block }: { block: Block }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const {
    url = "",
    title = "",
    note = "",
  } = block.props as Record<string, string>;
  const safe = webUrl.safeParse(url).success;
  const domain = safe ? new URL(url).hostname.replace(/^www\./, "") : undefined;
  const preview =
    safe &&
    failedUrl !== url &&
    /\.(?:png|jpe?g|webp|gif|avif)$/i.test(new URL(url).pathname);
  const ReferenceIcon =
    domain?.includes("youtube.com") || domain === "youtu.be"
      ? Play
      : domain?.includes("instagram.com")
        ? Video
        : domain?.includes("soundcloud.com") ||
            /\.(?:mp3|wav|m4a|ogg)(?:\?|$)/i.test(url)
          ? Music2
          : Link2;
  return (
    <SelectableBlock
      id={block.id!}
      label={`Референс: ${title || "Без названия"}`}
      className="brief-reference"
    >
      <span className="reference-symbol">
        {preview ? (
          <Image
            unoptimized
            src={url}
            width={28}
            height={30}
            alt={`Предпросмотр: ${title || domain}`}
            className="reference-thumbnail"
            onError={() => setFailedUrl(url)}
          />
        ) : (
          <ReferenceIcon size={16} aria-hidden="true" />
        )}
      </span>
      <div className="reference-copy">
        {safe ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
          >
            {title || url}
            <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        ) : (
          <strong>{title || "Укажите ссылку в свойствах"}</strong>
        )}
        {domain && <span className="reference-domain">{domain}</span>}
        {note && <p>{note}</p>}
      </div>
    </SelectableBlock>
  );
}

export function ImageContent({ block }: { block: Block }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const { url = "", caption = "" } = block.props as Record<string, string>;
  const safe = webUrl.safeParse(url).success;
  return (
    <SelectableBlock
      id={block.id!}
      label={`Изображение: ${caption || "Без подписи"}`}
      className="brief-image"
    >
      <figure>
        {safe && failedUrl !== url ? (
          <Image
            unoptimized
            src={url}
            width={1200}
            height={1600}
            alt={caption || "Изображение контент-плана"}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailedUrl(url)}
          />
        ) : (
          <div className="image-placeholder">
            <ImageIcon aria-hidden="true" />
            <span>
              {failedUrl === url
                ? "Изображение недоступно"
                : url
                  ? "Укажите корректный URL изображения"
                  : "Изображение по ссылке"}
            </span>
            {safe && failedUrl === url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
              >
                Открыть оригинал
              </a>
            )}
          </div>
        )}
        {caption && <figcaption>{caption}</figcaption>}
      </figure>
    </SelectableBlock>
  );
}
