// need this for module else createApp fails
import { createApp } from 'https://unpkg.com/petite-vue?module'

const htmlPath = './html/'

// loads and inserts html + script into the DOM
async function loadHtmlScript( file,targetEl,mode='replace' ){
   return new Promise( async (resolve,reject)=>{
   try{
      let data = await fetch(`${htmlPath}${file}.html`).then ( async r=>r.ok ? r.text() : '' )
      // TEMP removes pre-pended debuggers (vite|vscode) injected at start
      const scanPos = data.indexOf('<'+'/script>')
      const scan = data.substring(0,scanPos).toLowerCase()
      if( scan.indexOf('src="/@vite/client"') || scan.indexOf('src="/___vscode_livepreview_injected_script"') )
         data = data.substring(scanPos+9)
      
      // script has to be handled differently, so parse it off (it needs to be placed first)
      const p = data.lastIndexOf('<'+'/script>')

      let code, html
      if( p>0 ){
         code = data.substring(0,p+9).trim()
         code = code.substring(8,code.length-9)
         html = data.substring(p+9).trim()
      } else {
         code = ''
         html = data.trim()
      }
      // console.log( `SCRIPT:`, code )
      // console.log( 'HTML: ', html )
      if( html.length ){
         if( mode=='append' )
            document.querySelector(targetEl).innerHTML += html
         else
            document.querySelector(targetEl).innerHTML = html
      }

      if( code.length>1 ){
         // creates a script tag with same name as target element
         targetEl = ['.','#'].includes(targetEl[0]) ? targetEl.slice(1) : targetEl
         const os = document.body.querySelector( `#__${targetEl}` )
         if( os ) os.parentNode.removeChild(os)

         // creates in shadowDOM first then injects into DOM
         const s = document.createElement('script')
         // s.type = 'module';
         s.id = `__${targetEl}`

         try {
            s.appendChild(document.createTextNode(code))
            document.body.appendChild(s)
         } catch (e) {
            // if first fails, try attaching this way
            s.text = code;
            document.body.appendChild(s)
         }
      }
      resolve( html.length>0,code.length>0 )
   } catch( e ){
      console.log( `[loadFileHtml] unable to load '${file}'` )
      reject()
   }
   })
}

// loads html + script and mount the Petite-VueJS component
async function injectVue( vueName, targetEl ){
   const firstUpper = s=>s[0].toUpperCase() + s.slice(1).toLowerCase()
   const RouteVue = firstUpper(vueName)

   await loadHtmlScript( vueName, targetEl )
   // console.log( `[injectVue] loaded '${vueName}' in ${targetEl}, createApp(${RouteVue})... ` )
   if( typeof createApp === "function")
      createApp({ RouteVue }).mount()
   else
      console.log( `*ERROR* Unable to do VueJS createApp()`)
}

/**
 * use the hashtag in the URL to load page and inject in #router
 * will mount the Vue component of the same name as the injected file
 * 
 * pageName: can be directly injected, otherwise defaults to the browser hash
 * restrictRoutes: can limit which routes to switch to
 * routerEl: specify which element to target as the router
 **/
async function router( routeNameHash, routerEl='#router', restrictRoutes=[] ){
   // pageName: 
   // - addEventListener:hashchange -> calls passing hash-object (ignored, future-use)
   // - manually calling with a pageName possible
   const routeName = typeof(routeNameHash)=='string' 
                    ? routeNameHash 
                    : location.hash.slice(1).toLowerCase() || 'index'
   // console.log( `[router] routeName(${routeName}) routeNameHash:`, routeNameHash )
   
   if( restrictRoutes.length==0 || restrictRoutes.includes(routeName) ){
      injectVue( routeName, routerEl )
   }
}
 
// run router on hashtag changes
window.addEventListener('hashchange', router )

export { injectVue,router }