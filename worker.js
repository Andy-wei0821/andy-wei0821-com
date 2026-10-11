const SUPABASE_URL='https://sqoodnphzbzuqwhlgtoos.supabase.co';
const SUPABASE_KEY='sb_publishable_-pHlNCAl_EUdfxWHHQGW_A_h9iJXGs7';
export default{
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/')){
      try{
        const restPath=url.pathname.replace(/^\/api/,'/rest/v1');
        const target=`${SUPABASE_URL}${restPath}${url.search}`;
        const h=new Headers(request.headers);
        h.set('apikey',SUPABASE_KEY);
        h.set('Authorization',`Bearer ${SUPABASE_KEY}`);
        h.set('Host',new URL(SUPABASE_URL).host);
        h.delete('Origin');h.delete('Referer');
        const r=await fetch(new Request(target,{method:request.method,headers:h,body:(request.method==='GET'||request.method==='HEAD')?undefined:request.body}));
        return new Response(r.body,{status:r.status,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'}});
      }catch(e){
        return new Response(JSON.stringify({err:'proxy_failed',msg:e.message,type:e.name,target:url.pathname}),{status:500,headers:{'Access-Control-Allow-Origin':'*'}});
      }
    }
    if(url.pathname==='/api-debug'){
      try{
        const r=await fetch(SUPABASE_URL+'/rest/v1/posts?select=id&limit=1',{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY}});
        return new Response('sb='+r.status+' len='+(await r.text()).length,{headers:{'Access-Control-Allow-Origin':'*'}});
      }catch(e){
        return new Response('sb_fail: '+e.message,{status:500,headers:{'Access-Control-Allow-Origin':'*'}});
      }
    }
    return env.ASSETS?env.ASSETS.fetch(request):new Response('no assets binding',{status:500});
  }
};
