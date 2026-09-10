import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { syncCurrentData } from "@/features/sync/service";

function authorized(request:Request){const expected=process.env.CRON_SECRET;const supplied=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");if(!expected||!supplied)return false;const a=Buffer.from(expected),b=Buffer.from(supplied);return a.length===b.length&&timingSafeEqual(a,b);}
export async function GET(request:Request){if(!authorized(request))return NextResponse.json({error:"Unauthorized"},{status:401});const results=await syncCurrentData(undefined,false);return NextResponse.json({ok:results.every(item=>item.errors===0),results});}
