import {starterRoute} from "./nova-image-display.ts";
import "jsr:@supabase/functions-js@2.5.0/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
const OWNER_CONTACT="d78448b8-529a-4219-aa37-40656bbf418b";
const OWNER_LOGIN_EMAIL="jhiguera1@icloud.com";
const ORIGINS=new Set(["https://chat.smplyai.com","https://hldirect1-sys.github.io","https://smplyai.com","https://www.smplyai.com","https://equinox-canvas.vibepreview.com","https://1787960671129349981.vibepreview.com","https://preview-1787960671129349981.vibepreview.com"]);
const BASE_ALLOW=["authorization","apikey","content-type","x-client-info","accept","prefer","x-session-id","x-request-id"];
// CORS fix 2026-10-09: also allow any header names the browser asks for in the preflight, so an extra header from the page can't silently block the POST.
function allowHeaders(requested:string|null){const extra=String(requested??"").toLowerCase().split(",").map(s=>s.trim()).filter(s=>/^[a-z0-9-]{1,64}$/.test(s));return [...new Set([...BASE_ALLOW,...extra])].join(",");}
function headers(origin:string|null,requested:string|null=null){return {"content-type":"application/json","cache-control":"no-store","vary":"Origin, Access-Control-Request-Headers",...(origin&&ORIGINS.has(origin)?{"access-control-allow-origin":origin,"access-control-allow-methods":"POST,OPTIONS","access-control-allow-headers":allowHeaders(requested),"access-control-max-age":"600"}:{})};}
Deno.serve(async req=>{
 const origin=req.headers.get("origin");
 const requested=req.headers.get("access-control-request-headers");
 const respond=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:headers(origin)});
 if(origin&&!ORIGINS.has(origin))return respond({ok:true,reply:"This chat origin is not allowed.",assistant:"Nova"});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin,requested)});
 if(req.method!=="POST")return respond({ok:true,reply:"POST required."});
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key)return respond({ok:true,reply:"Chat configuration is missing."});
 const token=(req.headers.get("authorization")??"").replace(/^Bearer\s+/i,"").trim();
 if(!token)return respond({ok:true,reply:"Sign in again. The chat has no session."});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const auth=await db.auth.getUser(token);
 const user=auth.data?.user;
 if(auth.error||!user||!user.email_confirmed_at)return respond({ok:true,reply:"Sign in again. The session is not verified."});
 const owner=await db.from("contacts").select("email").eq("id",OWNER_CONTACT).maybeSingle();
 if(owner.error)return respond({ok:true,reply:"Chat identity could not be read."});
 const verifiedEmail=user.email?.toLowerCase();
 const isOwner=!!verifiedEmail&&(verifiedEmail===OWNER_LOGIN_EMAIL || (!!owner.data?.email&&verifiedEmail===String(owner.data.email).toLowerCase()) || (user.id==="c3e3f08c-f0d0-477b-8e15-9adf3f682635"&&verifiedEmail==="hldirect1@gmail.com"));
 const b=await req.json().catch(()=>null);
 if(!b||typeof b!=="object")return respond({ok:true,reply:"The chat sent invalid data."});

 // Explicit brain selection. Credentials stay server-side; verified identity controls access.
 const brain=b.brain??"nova";
 if(!["nova","tax","travel"].includes(brain))return respond({ok:false,reply:"Choose Nova, Tax Brain or Travel Brain."},400);
 if(brain!=="nova"){
  if(!isOwner)return respond({ok:false,reply:"Specialist brains are currently available in the owner workspace.",assistant:brain==="travel"?"Travel Brain":"Tax Brain"},403);
  if(Array.isArray(b.files)&&b.files.length)return respond({ok:false,reply:"Send a text message to this specialist. Document uploads are not connected to this tab yet."},400);
  const specialist=brain==="travel"?"Travel Brain":"Tax Brain";
  const input=typeof b.message==="string"?b.message.trim().slice(0,brain==="travel"?4000:12000):"";
  if(!input)return respond({ok:false,reply:"Please enter a message.",assistant:specialist},400);
  const sid=typeof b.session_id==="string"?b.session_id.replace(/[^a-zA-Z0-9_-]/g,"").slice(0,70):"default";
  try{
   const {data:secret,error}=await db.rpc("get_nova_specialist_key",{p_brain:brain});if(error||!secret)return respond({ok:false,reply:specialist+" is not configured.",assistant:specialist},503);
   const upstream=await fetch(url+"/functions/v1/"+brain+"-brain",{method:"POST",headers:{"content-type":"application/json",[brain==="travel"?"x-travel-key":"x-brain-key"]:String(secret)},body:JSON.stringify({action:"chat",customer_id:user.id,conversation_id:brain+"_"+sid,message:input}),signal:AbortSignal.timeout(150000)});
   const d=await upstream.json().catch(()=>null);
   if(!upstream.ok||!d||d.error||!d.reply)return respond({ok:false,reply:specialist+" could not answer: "+String(d?.error??upstream.status),assistant:specialist},502);
   return respond({ok:true,reply:String(d.reply),assistant:specialist,brain,session_id:sid,proof:brain==="tax"?d.proof:undefined,needs_preparer:brain==="tax"?d.needs_preparer:undefined,searches:brain==="travel"?d.searches:undefined,evidence:brain==="travel"?d.evidence:undefined,model:d.model,source:d.source});
  }catch{return respond({ok:false,reply:specialist+" is unavailable. Please try again.",assistant:specialist},503);}
 }

 let message=typeof b.message==="string"?b.message.trim().slice(0,12000):"";
 // v2026-10-09 (Claude): "fix it" now starts Nova's self-repair (diagnose, read code, propose a fix for John's approval) instead of only syncing the server. Other messages that mention "fix" go to Nova normally.
 if(isOwner&&/^\/?\s*fix(\s+it)?[\s.!]*$/i.test(message))message="Something in Nova is broken. Use nova_system_diagnose to find what is failing, then use nova_self_repair (read_code, then propose_fix) to propose an exact fix for my approval. If nothing is failing, tell me what you checked.";
 // v2026-10-09 (Claude): pictures/PDFs from the chat page arrive base64 in b.files, are stored privately in
 // nova-documents/site-uploads/<user id>/ by this function (service role) and handed to Nova as 15-minute signed links.
 // Empty messages without a readable file never reach Nova (the old smplyai.com page looped blank "attachment" sends).
 const inlineFiles=(Array.isArray(b.files)?b.files:[]).slice(0,4);
 const attachUrls:string[]=[];
 for(const f of inlineFiles){
  const type=String(f?.type??"").toLowerCase();
  if(!/^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/.test(type))continue;
  let bytes:Uint8Array;try{const bin=atob(String(f?.data??"").replace(/\s+/g,""));bytes=Uint8Array.from(bin,(c)=>c.charCodeAt(0));}catch{continue;}
  if(!bytes.length||bytes.length>8000000)continue;
  const ext=type==="application/pdf"?"pdf":type.split("/")[1].replace("jpeg","jpg");
  const path="site-uploads/"+user.id+"/"+Date.now().toString(36)+"_"+crypto.randomUUID().slice(0,8)+"."+ext;
  const up=await db.storage.from("nova-documents").upload(path,bytes,{contentType:type,upsert:false});
  if(up.error)continue;
  const signed=await db.storage.from("nova-documents").createSignedUrl(path,900);
  if(!signed.error&&signed.data?.signedUrl)attachUrls.push(signed.data.signedUrl);
 }
 if(!message&&!attachUrls.length)return respond({ok:true,reply:inlineFiles.length?"I couldn't read that file. Please try a JPG, PNG or PDF under 8 MB.":"I didn't receive any text. Please type your message or attach a picture.",assistant:"Nova"});
 const requestedSession=typeof b.session_id==="string"?b.session_id.replace(/[^a-zA-Z0-9_-]/g,"").slice(0,70):"";
 const outbound=starterRoute(message);
 try{
  const secret=await db.rpc("get_amy_web_chat_secret");
  if(secret.error||!secret.data)return respond({ok:true,reply:"Chat secret is missing. No answer ran.",assistant:"Nova"});
  const upstream=await fetch(url+"/functions/v1/ghl-openrouter",{method:"POST",headers:{"content-type":"application/json","x-amy-web-secret":String(secret.data),"x-nova-user-token":token},body:JSON.stringify({channel:"web",site_client:"smplyai",message:outbound||"[sent an attachment]",session_id:requestedSession||"default",...(attachUrls.length?{attachments:attachUrls}:{})}),signal:AbortSignal.timeout(150000)});
  const d=await upstream.json().catch(()=>null);
  if(!upstream.ok||!d||d.ok===false||d.error)return respond({ok:true,reply:"The answer service failed: "+String(d?.error||upstream.status)+".",assistant:"Nova"});
  const reply=String(d.reply??d.answer??d.response??"").trim();
  if(!reply)return respond({ok:true,reply:"The answer came back empty.",assistant:"Nova"});
  // Preserve public search receipts so the front end can display retrieved sources.
  // Keep internal system-tool receipts inside the upstream service.
  const search=d.tools?.search && typeof d.tools.search==="object" ? d.tools.search : null;
  const webSearch=d.web_search && typeof d.web_search==="object" ? {ran:d.web_search.ran===true,ok:d.web_search.ok===true,error:typeof d.web_search.error==="string"?d.web_search.error:null} : null;
  return respond({ok:true,reply,assistant:"Nova",session_id:requestedSession||"default",tools:{search},web_search:webSearch});
 }catch(e){
   return respond({ok:true,reply:e instanceof Error&&e.name==="TimeoutError"?"The answer timed out after 150 seconds.":"The answer service is unavailable.",assistant:"Nova"});
 }
});
