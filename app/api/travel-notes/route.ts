import { env } from 'cloudflare:workers';
import { getTravelNotes, saveTravelNote } from '@/db/travelNotes';

export const dynamic = 'force-dynamic';

type RuntimeEnv = {
  TRAVEL_NOTES_OWNER_EMAIL?: string;
  TRAVEL_NOTES_ADMIN_PASSWORD?: string;
};

const responseHeaders = {
  'Cache-Control': 'no-store',
};

function isLocalPreview(request: Request) {
  const hostname = new URL(request.url).hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function canEdit(request: Request) {
  if (isLocalPreview(request)) return true;

  const runtimeEnv = env as unknown as RuntimeEnv;
  const ownerEmail = runtimeEnv.TRAVEL_NOTES_OWNER_EMAIL?.trim().toLowerCase();
  const visitorEmail = request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
  if (ownerEmail && visitorEmail && ownerEmail === visitorEmail) return true;

  const configuredPassword = runtimeEnv.TRAVEL_NOTES_ADMIN_PASSWORD;
  const authorization = request.headers.get('authorization');
  const suppliedPassword = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  return Boolean(configuredPassword && suppliedPassword && configuredPassword === suppliedPassword);
}

export async function GET() {
  try {
    return Response.json({ notes: await getTravelNotes() }, { headers: responseHeaders });
  } catch (error) {
    console.error('Unable to load travel notes', error);
    return Response.json({ error: '留言暂时无法读取' }, { status: 500, headers: responseHeaders });
  }
}

export async function POST(request: Request) {
  if (!canEdit(request)) {
    return Response.json({ error: '编辑密码不正确' }, { status: 403, headers: responseHeaders });
  }

  return Response.json({ ok: true }, { headers: responseHeaders });
}

export async function PUT(request: Request) {
  if (!canEdit(request)) {
    return Response.json({ error: '只有站点主人可以修改留言' }, { status: 403, headers: responseHeaders });
  }

  try {
    const body = await request.json() as { key?: unknown; note?: unknown };
    if (typeof body.key !== 'string' || !/^[a-z0-9-]{1,120}$/.test(body.key)) {
      return Response.json({ error: '照片标识无效' }, { status: 400, headers: responseHeaders });
    }
    if (typeof body.note !== 'string' || body.note.length > 500) {
      return Response.json({ error: '留言不能超过 500 个字符' }, { status: 400, headers: responseHeaders });
    }

    await saveTravelNote(body.key, body.note.trim());
    return Response.json({ ok: true }, { headers: responseHeaders });
  } catch (error) {
    console.error('Unable to save travel note', error);
    return Response.json({ error: '留言暂时无法保存' }, { status: 500, headers: responseHeaders });
  }
}
