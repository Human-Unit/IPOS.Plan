import { NextRequest, NextResponse } from "next/server";
import { createPublication, isConfigured, isPublisher } from "@/lib/publications/server";
import { publicationHeaders, publicationWriteError, readPublicationInput } from "@/lib/publications/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isConfigured())
    return NextResponse.json({ error: "Публикация на сервере не настроена." }, { status: 503, headers: publicationHeaders });
  if (!isPublisher(request.headers.get("x-ipos-publish-key") ?? ""))
    return NextResponse.json({ error: "Неверный код публикации." }, { status: 403, headers: publicationHeaders });

  try {
    const { title, slug, document } = await readPublicationInput(request);
    return NextResponse.json(await createPublication(title, slug, document), {
      status: 201, headers: publicationHeaders,
    });
  } catch (error) {
    return publicationWriteError(error);
  }
}
