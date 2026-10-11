export function starterRoute(message:string){
 const t=message.trim();
 if(/flights from new york to los angeles/i.test(t))return 'Use the flight tool for NYC to LAX. '+t;
 if(/2026 tax brackets/i.test(t))return 'Use web search. '+t;
 if(/standard nda/i.test(t))return 'Use saved knowledge. '+t;
 return message;
}
export function imageIntent(){return 'ordinary';}
export function extractOwnedImage(){return null;}
