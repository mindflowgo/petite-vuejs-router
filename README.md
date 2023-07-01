# Petite-Router

Petite-Router is a simple yet powerful router that tries to stay out of your way, regardless of your development framework.

Routers can be nested, scope is not affected by the router

Use it as a module as follows:

```
import { routerInit,injectHtmlPage } from './petite-router.js'

// main router
routerInit('#router','mountVue') 

// sub-router for the register/... path
routerInit('#router_register','mountSelf','register/')
```

This loads the router, you can then initialize it by simply calling *routerInit([router element], [initializer script], [lock-router path] )*

For a root-level router, you just need element where router will place route components and how to initialize the route component.

If you are nesting a route, as above, it means that there's a secondary router that only works on the path *register/* : so this route works on sub-links like register/index|register/user|register/general, and it will look for a subdirectory in html with these files (register/index.html, register/user.html, ...)

Currently implementation for Petite-VueJS has been showcased.

# Why Use Petite Router?

Frameworks like React and VueJS 3 are awesome, but because they do not work on the DOM directly, most libraries working on vanilla-JS will not work or refresh properly with them.

This is where simpler frameworks worked great (I really liked one called AureliaJS). Vue has released a nice stripped-down version that works directly on the DOM called Petite-Vue, and it combined with this router gives a healthy amount of functionality and flexibility to use other vanilla-JS features.

Some good articles on 'routing' here:

[Routing In Javascript](https://medium.com/@fro_g/routing-in-javascript-d552ff4d2921)

Feedback welcome here.

Fil
fil [a.t.] rezox [d.0t] com
