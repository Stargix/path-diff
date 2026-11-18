/* Apply the saved theme before first paint; keep dark as the default. */
(function () {
 'use strict';
 const root=document.documentElement, key='path-diff-theme';
 let theme='dark';
 try {if(localStorage.getItem(key)==='light')theme='light';} catch {}
 root.dataset.theme=theme;
 function refresh(){
  const button=document.getElementById('theme-toggle');
  if(button){
   const target=theme==='dark'?'light':'dark';
   button.textContent=target==='light'?'Light theme':'Dark theme';
   button.setAttribute('aria-label','Switch to '+target+' theme');
   button.hidden=false;
  }
  document.querySelectorAll('img[src^="assets/figures/timing/"]').forEach(image=>{
   const dark=image.dataset.darkSrc||(image.dataset.darkSrc=image.getAttribute('src'));
   const source=theme==='light'?dark.replace('/timing/','/timing/light/'):dark;
   const versioned=source+'?v=20261118-pace';
   if(image.getAttribute('src')!==versioned)image.setAttribute('src',versioned);
  });
 }
 function init(){
  refresh();
  const button=document.getElementById('theme-toggle');
  if(button)button.addEventListener('click',()=>{
   theme=theme==='dark'?'light':'dark';root.dataset.theme=theme;
   try {localStorage.setItem(key,theme);} catch {}
   refresh();
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
