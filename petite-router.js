/*********************************************
 * Petite Router
 * 
 * Written by Filipe Laborde
 * version 1.1
 * 
 * Simple generic router that attempts to let you
 * use any sort of javascript frameworks and just
 * switch any windows with routes
 * 
 * After a route loads, it attempts to run a 
 * self-named initializer function
 * 
 * Has Petite-Vue included for framework, but can switch out
 */
import { createApp } from 'https://unpkg.com/petite-vue?module'

// router template files
const htmlPath = './html/'

// if multiple routers sometimes sub-routers will attempt rendering before the outter one
// the system will delay 10s and try again (up to 500ms, else there must be other issues!!!)
async function injectInDOM( targetEl, html ){
   let tryMax = 50
   function _tryInject( resolve,reject, targetEl, html ){
      tryMax--;
      // console.log( `[injectInDOM] ${tryMax}: ${targetEl} not yet avail, waiting 10ms` )
      if( document.querySelector(targetEl) ){
         // console.log( ` ... ${targetEl} should be ready now.`)
         document.querySelector(targetEl).innerHTML = html
         resolve()
      } else if( tryMax>0 ) {
         setTimeout( function(){ _tryInject(resolve,reject,targetEl,html) }, 10 )
      } else {
         reject()
      }
   }
   return new Promise( async (resolve,reject)=>{
      if( document.querySelector(targetEl) ){
         document.querySelector(targetEl).innerHTML = html
         resolve()
      } else {
         _tryInject(resolve,reject,targetEl,html)
      }
   })
}

// loads and inserts html + script into the DOM
// <scripts will be parsed out and appended to body DOM.
async function injectHtmlAndScript( file,targetEl ){
   return new Promise( async (resolve,reject)=>{
   // try{
      if( file=='' || !targetEl ){
         console.log( `[injectHtmlAndScript] Failed! file(${file}) targetEl(${targetEl})` )
         reject()
      }
      let html = await fetch(`${htmlPath}${file}.html`).then ( async r=>r.ok ? r.text() : '' )
      // TEMP removes pre-pended debuggers (vite|vscode) injected at start
      const scanPos = html.indexOf('<'+'/script>')
      const scan = html.substring(0,scanPos).toLowerCase()
      if( scan.indexOf('src="/@vite/client"') || scan.indexOf('src="/___vscode_livepreview_injected_script"') )
         html = html.substring(scanPos+9)
      
      // script has to be handled differently, so parse it off (it needs to be placed first)
      const scriptRegEx = /<script(\b[^>]*)>([\s\S]*?)<\/script>/gmi
      const scriptSrcRegEx = /\bsrc\s*=\s*(\"[^"]+|\'[^']+|\/\/[^\s]+)/gmi
      const scriptBlocks = []
      let script = true
      while (script = scriptRegEx.exec(html)) {
         // check for a src= tag in script
         const src = scriptSrcRegEx.exec(script[1])
         scriptSrcRegEx.lastIndex = 0  // reset pointer after use
         if( src && (src[1][0]=='"' || src[1][0]=="'")) src[1]=src[1].substring(1)
         
         const scriptData = {idx: script.index, len: script[0]?.length, src: src ? src[1] : null, text: script[2].trim() }
         scriptBlocks.push(scriptData)
      }
      // now remove these blocks from the html
      for( let block of scriptBlocks )
         html = (block.idx>0 ? html.substring(0,block.idx) : '' )+html.substring(block.idx+block.len)
         
      if( html.length ){
         // console.log( ` writing ${html.length}bytes to ${targetEl}`)
         await injectInDOM( targetEl, html )
         // document.querySelector(targetEl).innerHTML = html
      }

      // remove previous script blocks of this same target, before injecting new
      targetEl = ['.','#'].includes(targetEl[0]) ? targetEl.slice(1) : targetEl
      const removeNodes = document.body.querySelectorAll( `[id^='__${targetEl}']` )
      for( let i=0; i<removeNodes.length; i++ )
         removeNodes[i].parentNode.removeChild(removeNodes[i])

      if( scriptBlocks.length ){
         for( let i=0; i<scriptBlocks.length; i++ ){
            // creates in shadowDOM first then injects into DOM
            const s = document.createElement('script')
            // s.type = 'module';
            s.id = `__${targetEl}${i}`
            if( scriptBlocks[i].src ){
               console.log( `[Warning] Skipping external source '${scriptBlocks[i].src}'...` )
               // doesn't work, if find a way add - but remember to SKIP src ~= vite|vscode (for debuggers)
               // s.src = scriptBlocks[i].src
            } else {
               try {
                  s.appendChild(document.createTextNode(scriptBlocks[i].text))
                  // console.log( `[script ${i}] inserting ${s.id}` )
                  document.body.appendChild(s)
               } catch (e) {
                  // if first fails, try attaching this way
                  s.text = scriptBlocks[i].text;
                  document.body.appendChild(s)
               }
            }
         }
      }
      resolve( html.length>0,scriptBlocks.length>0 )
   // } catch( e ){
   //    console.log( `[loadFileHtml] unable to load '${file}'` )
   //    reject()
   // }
   })
}

// loads html + script and mount the Petite-VueJS component
async function injectHtmlPage( templateName, targetEl, initAction='mountSelf' ){
   await injectHtmlAndScript( templateName, targetEl )
   // console.log( `[injectHtmlAndScript] loaded '${templateName}' in ${targetEl} (init:${initAction})... ` )
   if( initAction==='mountVue' || initAction==='mountSelf' ){
      function PascalCase( str ){
         let out = str[0].toUpperCase()
         for( let i=1; i<str.length; i++ ){
             if( str[i]==='/' ) continue
             if( str[i]==='.' ) return out
             out += ( str[i-1]==='/' ? str[i].toUpperCase() : str[i] )
         }
         return out
      }
      const initScript = PascalCase(templateName)
      // console.log( ` ... running ${initAction} on  ${initScript}` )
      if( initAction==='mountVue' ){
         createApp({ initScript }).mount()

      } else if( this ){
         if( typeof this[initScript] === 'function' )
            this[initScript]()
         else if( typeof this[initScript] === 'object' )
            this[initScript].init()
      } else {
         eval( `if( typeof(${initScript})==='function' ) ${initScript}(); else if( typeof(${initScript})==='object' ) ${initScript}.init(); ` )

      }
   }

   
}

/**
 * hashtag changes trigger the router function and it will change the 
 * respective content in the tag
 **/
async function router( routerEl,callbackAction,routeSubPath,hash ){
   const depth = [...routeSubPath].filter(x => x === '/').length
   const paths = location.hash.slice(1).toLowerCase().split('/')
   const oldURL = hash && hash.oldURL ? (hash.oldURL.substring(hash.oldURL.indexOf('#')).slice(1).toLowerCase() || '').split('/') : []
   let routePath = paths[0]
   let oldPath = oldURL[0] || ''
   let routeBase = ''
   for( let i=0; i<depth; i++ ){
      routePath += '/' + paths[i+1] || 'index'
      oldPath += '/' + oldURL[i+1]
      routeBase += paths[i]+'/'
   }
   if( oldPath!=='' && oldPath===routePath ){
      // console.log( `[router:${depth}] path unchanged (${routePath}), ignoring.`)
      return
   
   } else if( routePath.indexOf(routeSubPath)>-1) { // determine if this router is to manage this route change
      // console.log( `[router:${depth}] path changed & part of subpath, updating: routePath(${routePath})`)
      if( routePath.substring(routePath.length-1)==='/' ) routePath += 'index'
      injectHtmlPage( routePath, routerEl, callbackAction )
   }
}

function routerInit( routerEl='#router', callbackAction='self', routeSubPath='' ){
   // console.log( `[routerInit] routerEl(${routerEl}) callbackAction(${callbackAction}) depth(${depth}) routePathRestrict:`, routePathRestrict )
   // run router on hashtag changes [closure]
   window.addEventListener('hashchange', (hash)=>router(routerEl,callbackAction,routeSubPath,hash) ) 
   // run router as soon as page loaded
   window.addEventListener('load', (hash)=>router(routerEl,callbackAction,routeSubPath,hash) )
}
 

export { routerInit, injectHtmlPage }