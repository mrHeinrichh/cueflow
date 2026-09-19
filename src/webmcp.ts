import { useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import type { Script } from './model';
import { words } from './model';
type Tool = { name:string; title:string; description:string; inputSchema:object; annotations:{readOnlyHint:boolean;untrustedContentHint:boolean}; execute:(input:unknown)=>unknown };
export function useStudioTools(scripts:Script[],activeId:string,select:(id:string)=>void) {
 const state=useRef({scripts,activeId,select});state.current={scripts,activeId,select};
 useEffect(()=>{
  const context=(document as Document & {modelContext?:{registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
  if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  const tools:Tool[]=[{
   name:'list_cueflow_scripts',title:'List local scripts',description:'Read script titles and word counts in this device’s CueFlow library.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>({activeId:state.current.activeId,scripts:state.current.scripts.map(s=>({id:s.id,title:s.title,words:words(s.content)}))})
  },{
   name:'select_cueflow_script',title:'Open script in prompter',description:'Select an existing local script, pause playback and open the studio. Does not start reading.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:(input)=>{const id=(input as {id?:unknown})?.id;if(typeof id!=='string'||!state.current.scripts.some(s=>s.id===id))throw new Error('Choose an existing script ID.');flushSync(()=>state.current.select(id));location.hash='/studio';return {selectedId:id,playing:false};}
  }];
  for(const tool of tools){try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Optional browser capability. */}}
  return()=>lifecycle.abort();
 },[]);
}
