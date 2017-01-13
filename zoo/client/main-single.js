/**
 * @license almond 0.3.3 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, http://github.com/requirejs/almond/LICENSE
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part, normalizedBaseParts,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name) {
            name = name.split('/');
            lastIndex = name.length - 1;

            // If wanting node ID compatibility, strip .js from end
            // of IDs. Have to do this here, and not in nameToUrl
            // because node allows either .js or non .js to map
            // to same file.
            if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
            }

            // Starts with a '.' so need the baseName
            if (name[0].charAt(0) === '.' && baseParts) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that 'directory' and not name of the baseName's
                //module. For instance, baseName of 'one/two/three', maps to
                //'one/two/three.js', but we want the directory, 'one/two' for
                //this normalization.
                normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                name = normalizedBaseParts.concat(name);
            }

            //start trimDots
            for (i = 0; i < name.length; i++) {
                part = name[i];
                if (part === '.') {
                    name.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i === 1 && name[2] === '..') || name[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        name.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
            //end trimDots

            name = name.join('/');
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    //Creates a parts array for a relName where first part is plugin ID,
    //second part is resource ID. Assumes relName has already been normalized.
    function makeRelParts(relName) {
        return relName ? splitPrefix(relName) : [];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relParts) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0],
            relResourceName = relParts[1];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relResourceName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relResourceName));
            } else {
                name = normalize(name, relResourceName);
            }
        } else {
            name = normalize(name, relResourceName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i, relParts,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;
        relParts = makeRelParts(relName);

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relParts);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, makeRelParts(callback)).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../static/components/almond/almond", function(){});

//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.
(function(){function n(n){function t(t,r,e,u,i,o){for(;i>=0&&o>i;i+=n){var a=u?u[i]:i;e=r(e,t[a],a,t)}return e}return function(r,e,u,i){e=b(e,i,4);var o=!k(r)&&m.keys(r),a=(o||r).length,c=n>0?0:a-1;return arguments.length<3&&(u=r[o?o[c]:c],c+=n),t(r,e,u,o,c,a)}}function t(n){return function(t,r,e){r=x(r,e);for(var u=O(t),i=n>0?0:u-1;i>=0&&u>i;i+=n)if(r(t[i],i,t))return i;return-1}}function r(n,t,r){return function(e,u,i){var o=0,a=O(e);if("number"==typeof i)n>0?o=i>=0?i:Math.max(i+a,o):a=i>=0?Math.min(i+1,a):i+a+1;else if(r&&i&&a)return i=r(e,u),e[i]===u?i:-1;if(u!==u)return i=t(l.call(e,o,a),m.isNaN),i>=0?i+o:-1;for(i=n>0?o:a-1;i>=0&&a>i;i+=n)if(e[i]===u)return i;return-1}}function e(n,t){var r=I.length,e=n.constructor,u=m.isFunction(e)&&e.prototype||a,i="constructor";for(m.has(n,i)&&!m.contains(t,i)&&t.push(i);r--;)i=I[r],i in n&&n[i]!==u[i]&&!m.contains(t,i)&&t.push(i)}var u=this,i=u._,o=Array.prototype,a=Object.prototype,c=Function.prototype,f=o.push,l=o.slice,s=a.toString,p=a.hasOwnProperty,h=Array.isArray,v=Object.keys,g=c.bind,y=Object.create,d=function(){},m=function(n){return n instanceof m?n:this instanceof m?void(this._wrapped=n):new m(n)};"undefined"!=typeof exports?("undefined"!=typeof module&&module.exports&&(exports=module.exports=m),exports._=m):u._=m,m.VERSION="1.8.3";var b=function(n,t,r){if(t===void 0)return n;switch(null==r?3:r){case 1:return function(r){return n.call(t,r)};case 2:return function(r,e){return n.call(t,r,e)};case 3:return function(r,e,u){return n.call(t,r,e,u)};case 4:return function(r,e,u,i){return n.call(t,r,e,u,i)}}return function(){return n.apply(t,arguments)}},x=function(n,t,r){return null==n?m.identity:m.isFunction(n)?b(n,t,r):m.isObject(n)?m.matcher(n):m.property(n)};m.iteratee=function(n,t){return x(n,t,1/0)};var _=function(n,t){return function(r){var e=arguments.length;if(2>e||null==r)return r;for(var u=1;e>u;u++)for(var i=arguments[u],o=n(i),a=o.length,c=0;a>c;c++){var f=o[c];t&&r[f]!==void 0||(r[f]=i[f])}return r}},j=function(n){if(!m.isObject(n))return{};if(y)return y(n);d.prototype=n;var t=new d;return d.prototype=null,t},w=function(n){return function(t){return null==t?void 0:t[n]}},A=Math.pow(2,53)-1,O=w("length"),k=function(n){var t=O(n);return"number"==typeof t&&t>=0&&A>=t};m.each=m.forEach=function(n,t,r){t=b(t,r);var e,u;if(k(n))for(e=0,u=n.length;u>e;e++)t(n[e],e,n);else{var i=m.keys(n);for(e=0,u=i.length;u>e;e++)t(n[i[e]],i[e],n)}return n},m.map=m.collect=function(n,t,r){t=x(t,r);for(var e=!k(n)&&m.keys(n),u=(e||n).length,i=Array(u),o=0;u>o;o++){var a=e?e[o]:o;i[o]=t(n[a],a,n)}return i},m.reduce=m.foldl=m.inject=n(1),m.reduceRight=m.foldr=n(-1),m.find=m.detect=function(n,t,r){var e;return e=k(n)?m.findIndex(n,t,r):m.findKey(n,t,r),e!==void 0&&e!==-1?n[e]:void 0},m.filter=m.select=function(n,t,r){var e=[];return t=x(t,r),m.each(n,function(n,r,u){t(n,r,u)&&e.push(n)}),e},m.reject=function(n,t,r){return m.filter(n,m.negate(x(t)),r)},m.every=m.all=function(n,t,r){t=x(t,r);for(var e=!k(n)&&m.keys(n),u=(e||n).length,i=0;u>i;i++){var o=e?e[i]:i;if(!t(n[o],o,n))return!1}return!0},m.some=m.any=function(n,t,r){t=x(t,r);for(var e=!k(n)&&m.keys(n),u=(e||n).length,i=0;u>i;i++){var o=e?e[i]:i;if(t(n[o],o,n))return!0}return!1},m.contains=m.includes=m.include=function(n,t,r,e){return k(n)||(n=m.values(n)),("number"!=typeof r||e)&&(r=0),m.indexOf(n,t,r)>=0},m.invoke=function(n,t){var r=l.call(arguments,2),e=m.isFunction(t);return m.map(n,function(n){var u=e?t:n[t];return null==u?u:u.apply(n,r)})},m.pluck=function(n,t){return m.map(n,m.property(t))},m.where=function(n,t){return m.filter(n,m.matcher(t))},m.findWhere=function(n,t){return m.find(n,m.matcher(t))},m.max=function(n,t,r){var e,u,i=-1/0,o=-1/0;if(null==t&&null!=n){n=k(n)?n:m.values(n);for(var a=0,c=n.length;c>a;a++)e=n[a],e>i&&(i=e)}else t=x(t,r),m.each(n,function(n,r,e){u=t(n,r,e),(u>o||u===-1/0&&i===-1/0)&&(i=n,o=u)});return i},m.min=function(n,t,r){var e,u,i=1/0,o=1/0;if(null==t&&null!=n){n=k(n)?n:m.values(n);for(var a=0,c=n.length;c>a;a++)e=n[a],i>e&&(i=e)}else t=x(t,r),m.each(n,function(n,r,e){u=t(n,r,e),(o>u||1/0===u&&1/0===i)&&(i=n,o=u)});return i},m.shuffle=function(n){for(var t,r=k(n)?n:m.values(n),e=r.length,u=Array(e),i=0;e>i;i++)t=m.random(0,i),t!==i&&(u[i]=u[t]),u[t]=r[i];return u},m.sample=function(n,t,r){return null==t||r?(k(n)||(n=m.values(n)),n[m.random(n.length-1)]):m.shuffle(n).slice(0,Math.max(0,t))},m.sortBy=function(n,t,r){return t=x(t,r),m.pluck(m.map(n,function(n,r,e){return{value:n,index:r,criteria:t(n,r,e)}}).sort(function(n,t){var r=n.criteria,e=t.criteria;if(r!==e){if(r>e||r===void 0)return 1;if(e>r||e===void 0)return-1}return n.index-t.index}),"value")};var F=function(n){return function(t,r,e){var u={};return r=x(r,e),m.each(t,function(e,i){var o=r(e,i,t);n(u,e,o)}),u}};m.groupBy=F(function(n,t,r){m.has(n,r)?n[r].push(t):n[r]=[t]}),m.indexBy=F(function(n,t,r){n[r]=t}),m.countBy=F(function(n,t,r){m.has(n,r)?n[r]++:n[r]=1}),m.toArray=function(n){return n?m.isArray(n)?l.call(n):k(n)?m.map(n,m.identity):m.values(n):[]},m.size=function(n){return null==n?0:k(n)?n.length:m.keys(n).length},m.partition=function(n,t,r){t=x(t,r);var e=[],u=[];return m.each(n,function(n,r,i){(t(n,r,i)?e:u).push(n)}),[e,u]},m.first=m.head=m.take=function(n,t,r){return null==n?void 0:null==t||r?n[0]:m.initial(n,n.length-t)},m.initial=function(n,t,r){return l.call(n,0,Math.max(0,n.length-(null==t||r?1:t)))},m.last=function(n,t,r){return null==n?void 0:null==t||r?n[n.length-1]:m.rest(n,Math.max(0,n.length-t))},m.rest=m.tail=m.drop=function(n,t,r){return l.call(n,null==t||r?1:t)},m.compact=function(n){return m.filter(n,m.identity)};var S=function(n,t,r,e){for(var u=[],i=0,o=e||0,a=O(n);a>o;o++){var c=n[o];if(k(c)&&(m.isArray(c)||m.isArguments(c))){t||(c=S(c,t,r));var f=0,l=c.length;for(u.length+=l;l>f;)u[i++]=c[f++]}else r||(u[i++]=c)}return u};m.flatten=function(n,t){return S(n,t,!1)},m.without=function(n){return m.difference(n,l.call(arguments,1))},m.uniq=m.unique=function(n,t,r,e){m.isBoolean(t)||(e=r,r=t,t=!1),null!=r&&(r=x(r,e));for(var u=[],i=[],o=0,a=O(n);a>o;o++){var c=n[o],f=r?r(c,o,n):c;t?(o&&i===f||u.push(c),i=f):r?m.contains(i,f)||(i.push(f),u.push(c)):m.contains(u,c)||u.push(c)}return u},m.union=function(){return m.uniq(S(arguments,!0,!0))},m.intersection=function(n){for(var t=[],r=arguments.length,e=0,u=O(n);u>e;e++){var i=n[e];if(!m.contains(t,i)){for(var o=1;r>o&&m.contains(arguments[o],i);o++);o===r&&t.push(i)}}return t},m.difference=function(n){var t=S(arguments,!0,!0,1);return m.filter(n,function(n){return!m.contains(t,n)})},m.zip=function(){return m.unzip(arguments)},m.unzip=function(n){for(var t=n&&m.max(n,O).length||0,r=Array(t),e=0;t>e;e++)r[e]=m.pluck(n,e);return r},m.object=function(n,t){for(var r={},e=0,u=O(n);u>e;e++)t?r[n[e]]=t[e]:r[n[e][0]]=n[e][1];return r},m.findIndex=t(1),m.findLastIndex=t(-1),m.sortedIndex=function(n,t,r,e){r=x(r,e,1);for(var u=r(t),i=0,o=O(n);o>i;){var a=Math.floor((i+o)/2);r(n[a])<u?i=a+1:o=a}return i},m.indexOf=r(1,m.findIndex,m.sortedIndex),m.lastIndexOf=r(-1,m.findLastIndex),m.range=function(n,t,r){null==t&&(t=n||0,n=0),r=r||1;for(var e=Math.max(Math.ceil((t-n)/r),0),u=Array(e),i=0;e>i;i++,n+=r)u[i]=n;return u};var E=function(n,t,r,e,u){if(!(e instanceof t))return n.apply(r,u);var i=j(n.prototype),o=n.apply(i,u);return m.isObject(o)?o:i};m.bind=function(n,t){if(g&&n.bind===g)return g.apply(n,l.call(arguments,1));if(!m.isFunction(n))throw new TypeError("Bind must be called on a function");var r=l.call(arguments,2),e=function(){return E(n,e,t,this,r.concat(l.call(arguments)))};return e},m.partial=function(n){var t=l.call(arguments,1),r=function(){for(var e=0,u=t.length,i=Array(u),o=0;u>o;o++)i[o]=t[o]===m?arguments[e++]:t[o];for(;e<arguments.length;)i.push(arguments[e++]);return E(n,r,this,this,i)};return r},m.bindAll=function(n){var t,r,e=arguments.length;if(1>=e)throw new Error("bindAll must be passed function names");for(t=1;e>t;t++)r=arguments[t],n[r]=m.bind(n[r],n);return n},m.memoize=function(n,t){var r=function(e){var u=r.cache,i=""+(t?t.apply(this,arguments):e);return m.has(u,i)||(u[i]=n.apply(this,arguments)),u[i]};return r.cache={},r},m.delay=function(n,t){var r=l.call(arguments,2);return setTimeout(function(){return n.apply(null,r)},t)},m.defer=m.partial(m.delay,m,1),m.throttle=function(n,t,r){var e,u,i,o=null,a=0;r||(r={});var c=function(){a=r.leading===!1?0:m.now(),o=null,i=n.apply(e,u),o||(e=u=null)};return function(){var f=m.now();a||r.leading!==!1||(a=f);var l=t-(f-a);return e=this,u=arguments,0>=l||l>t?(o&&(clearTimeout(o),o=null),a=f,i=n.apply(e,u),o||(e=u=null)):o||r.trailing===!1||(o=setTimeout(c,l)),i}},m.debounce=function(n,t,r){var e,u,i,o,a,c=function(){var f=m.now()-o;t>f&&f>=0?e=setTimeout(c,t-f):(e=null,r||(a=n.apply(i,u),e||(i=u=null)))};return function(){i=this,u=arguments,o=m.now();var f=r&&!e;return e||(e=setTimeout(c,t)),f&&(a=n.apply(i,u),i=u=null),a}},m.wrap=function(n,t){return m.partial(t,n)},m.negate=function(n){return function(){return!n.apply(this,arguments)}},m.compose=function(){var n=arguments,t=n.length-1;return function(){for(var r=t,e=n[t].apply(this,arguments);r--;)e=n[r].call(this,e);return e}},m.after=function(n,t){return function(){return--n<1?t.apply(this,arguments):void 0}},m.before=function(n,t){var r;return function(){return--n>0&&(r=t.apply(this,arguments)),1>=n&&(t=null),r}},m.once=m.partial(m.before,2);var M=!{toString:null}.propertyIsEnumerable("toString"),I=["valueOf","isPrototypeOf","toString","propertyIsEnumerable","hasOwnProperty","toLocaleString"];m.keys=function(n){if(!m.isObject(n))return[];if(v)return v(n);var t=[];for(var r in n)m.has(n,r)&&t.push(r);return M&&e(n,t),t},m.allKeys=function(n){if(!m.isObject(n))return[];var t=[];for(var r in n)t.push(r);return M&&e(n,t),t},m.values=function(n){for(var t=m.keys(n),r=t.length,e=Array(r),u=0;r>u;u++)e[u]=n[t[u]];return e},m.mapObject=function(n,t,r){t=x(t,r);for(var e,u=m.keys(n),i=u.length,o={},a=0;i>a;a++)e=u[a],o[e]=t(n[e],e,n);return o},m.pairs=function(n){for(var t=m.keys(n),r=t.length,e=Array(r),u=0;r>u;u++)e[u]=[t[u],n[t[u]]];return e},m.invert=function(n){for(var t={},r=m.keys(n),e=0,u=r.length;u>e;e++)t[n[r[e]]]=r[e];return t},m.functions=m.methods=function(n){var t=[];for(var r in n)m.isFunction(n[r])&&t.push(r);return t.sort()},m.extend=_(m.allKeys),m.extendOwn=m.assign=_(m.keys),m.findKey=function(n,t,r){t=x(t,r);for(var e,u=m.keys(n),i=0,o=u.length;o>i;i++)if(e=u[i],t(n[e],e,n))return e},m.pick=function(n,t,r){var e,u,i={},o=n;if(null==o)return i;m.isFunction(t)?(u=m.allKeys(o),e=b(t,r)):(u=S(arguments,!1,!1,1),e=function(n,t,r){return t in r},o=Object(o));for(var a=0,c=u.length;c>a;a++){var f=u[a],l=o[f];e(l,f,o)&&(i[f]=l)}return i},m.omit=function(n,t,r){if(m.isFunction(t))t=m.negate(t);else{var e=m.map(S(arguments,!1,!1,1),String);t=function(n,t){return!m.contains(e,t)}}return m.pick(n,t,r)},m.defaults=_(m.allKeys,!0),m.create=function(n,t){var r=j(n);return t&&m.extendOwn(r,t),r},m.clone=function(n){return m.isObject(n)?m.isArray(n)?n.slice():m.extend({},n):n},m.tap=function(n,t){return t(n),n},m.isMatch=function(n,t){var r=m.keys(t),e=r.length;if(null==n)return!e;for(var u=Object(n),i=0;e>i;i++){var o=r[i];if(t[o]!==u[o]||!(o in u))return!1}return!0};var N=function(n,t,r,e){if(n===t)return 0!==n||1/n===1/t;if(null==n||null==t)return n===t;n instanceof m&&(n=n._wrapped),t instanceof m&&(t=t._wrapped);var u=s.call(n);if(u!==s.call(t))return!1;switch(u){case"[object RegExp]":case"[object String]":return""+n==""+t;case"[object Number]":return+n!==+n?+t!==+t:0===+n?1/+n===1/t:+n===+t;case"[object Date]":case"[object Boolean]":return+n===+t}var i="[object Array]"===u;if(!i){if("object"!=typeof n||"object"!=typeof t)return!1;var o=n.constructor,a=t.constructor;if(o!==a&&!(m.isFunction(o)&&o instanceof o&&m.isFunction(a)&&a instanceof a)&&"constructor"in n&&"constructor"in t)return!1}r=r||[],e=e||[];for(var c=r.length;c--;)if(r[c]===n)return e[c]===t;if(r.push(n),e.push(t),i){if(c=n.length,c!==t.length)return!1;for(;c--;)if(!N(n[c],t[c],r,e))return!1}else{var f,l=m.keys(n);if(c=l.length,m.keys(t).length!==c)return!1;for(;c--;)if(f=l[c],!m.has(t,f)||!N(n[f],t[f],r,e))return!1}return r.pop(),e.pop(),!0};m.isEqual=function(n,t){return N(n,t)},m.isEmpty=function(n){return null==n?!0:k(n)&&(m.isArray(n)||m.isString(n)||m.isArguments(n))?0===n.length:0===m.keys(n).length},m.isElement=function(n){return!(!n||1!==n.nodeType)},m.isArray=h||function(n){return"[object Array]"===s.call(n)},m.isObject=function(n){var t=typeof n;return"function"===t||"object"===t&&!!n},m.each(["Arguments","Function","String","Number","Date","RegExp","Error"],function(n){m["is"+n]=function(t){return s.call(t)==="[object "+n+"]"}}),m.isArguments(arguments)||(m.isArguments=function(n){return m.has(n,"callee")}),"function"!=typeof/./&&"object"!=typeof Int8Array&&(m.isFunction=function(n){return"function"==typeof n||!1}),m.isFinite=function(n){return isFinite(n)&&!isNaN(parseFloat(n))},m.isNaN=function(n){return m.isNumber(n)&&n!==+n},m.isBoolean=function(n){return n===!0||n===!1||"[object Boolean]"===s.call(n)},m.isNull=function(n){return null===n},m.isUndefined=function(n){return n===void 0},m.has=function(n,t){return null!=n&&p.call(n,t)},m.noConflict=function(){return u._=i,this},m.identity=function(n){return n},m.constant=function(n){return function(){return n}},m.noop=function(){},m.property=w,m.propertyOf=function(n){return null==n?function(){}:function(t){return n[t]}},m.matcher=m.matches=function(n){return n=m.extendOwn({},n),function(t){return m.isMatch(t,n)}},m.times=function(n,t,r){var e=Array(Math.max(0,n));t=b(t,r,1);for(var u=0;n>u;u++)e[u]=t(u);return e},m.random=function(n,t){return null==t&&(t=n,n=0),n+Math.floor(Math.random()*(t-n+1))},m.now=Date.now||function(){return(new Date).getTime()};var B={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","`":"&#x60;"},T=m.invert(B),R=function(n){var t=function(t){return n[t]},r="(?:"+m.keys(n).join("|")+")",e=RegExp(r),u=RegExp(r,"g");return function(n){return n=null==n?"":""+n,e.test(n)?n.replace(u,t):n}};m.escape=R(B),m.unescape=R(T),m.result=function(n,t,r){var e=null==n?void 0:n[t];return e===void 0&&(e=r),m.isFunction(e)?e.call(n):e};var q=0;m.uniqueId=function(n){var t=++q+"";return n?n+t:t},m.templateSettings={evaluate:/<%([\s\S]+?)%>/g,interpolate:/<%=([\s\S]+?)%>/g,escape:/<%-([\s\S]+?)%>/g};var K=/(.)^/,z={"'":"'","\\":"\\","\r":"r","\n":"n","\u2028":"u2028","\u2029":"u2029"},D=/\\|'|\r|\n|\u2028|\u2029/g,L=function(n){return"\\"+z[n]};m.template=function(n,t,r){!t&&r&&(t=r),t=m.defaults({},t,m.templateSettings);var e=RegExp([(t.escape||K).source,(t.interpolate||K).source,(t.evaluate||K).source].join("|")+"|$","g"),u=0,i="__p+='";n.replace(e,function(t,r,e,o,a){return i+=n.slice(u,a).replace(D,L),u=a+t.length,r?i+="'+\n((__t=("+r+"))==null?'':_.escape(__t))+\n'":e?i+="'+\n((__t=("+e+"))==null?'':__t)+\n'":o&&(i+="';\n"+o+"\n__p+='"),t}),i+="';\n",t.variable||(i="with(obj||{}){\n"+i+"}\n"),i="var __t,__p='',__j=Array.prototype.join,"+"print=function(){__p+=__j.call(arguments,'');};\n"+i+"return __p;\n";try{var o=new Function(t.variable||"obj","_",i)}catch(a){throw a.source=i,a}var c=function(n){return o.call(this,n,m)},f=t.variable||"obj";return c.source="function("+f+"){\n"+i+"}",c},m.chain=function(n){var t=m(n);return t._chain=!0,t};var P=function(n,t){return n._chain?m(t).chain():t};m.mixin=function(n){m.each(m.functions(n),function(t){var r=m[t]=n[t];m.prototype[t]=function(){var n=[this._wrapped];return f.apply(n,arguments),P(this,r.apply(m,n))}})},m.mixin(m),m.each(["pop","push","reverse","shift","sort","splice","unshift"],function(n){var t=o[n];m.prototype[n]=function(){var r=this._wrapped;return t.apply(r,arguments),"shift"!==n&&"splice"!==n||0!==r.length||delete r[0],P(this,r)}}),m.each(["concat","join","slice"],function(n){var t=o[n];m.prototype[n]=function(){return P(this,t.apply(this._wrapped,arguments))}}),m.prototype.value=function(){return this._wrapped},m.prototype.valueOf=m.prototype.toJSON=m.prototype.value,m.prototype.toString=function(){return""+this._wrapped},"function"==typeof define&&define.amd&&define("underscore",[],function(){return m})}).call(this);
//# sourceMappingURL=underscore-min.map;
/*! jQuery v3.1.1 | (c) jQuery Foundation | jquery.org/license */
!function(a,b){"use strict";"object"==typeof module&&"object"==typeof module.exports?module.exports=a.document?b(a,!0):function(a){if(!a.document)throw new Error("jQuery requires a window with a document");return b(a)}:b(a)}("undefined"!=typeof window?window:this,function(a,b){"use strict";var c=[],d=a.document,e=Object.getPrototypeOf,f=c.slice,g=c.concat,h=c.push,i=c.indexOf,j={},k=j.toString,l=j.hasOwnProperty,m=l.toString,n=m.call(Object),o={};function p(a,b){b=b||d;var c=b.createElement("script");c.text=a,b.head.appendChild(c).parentNode.removeChild(c)}var q="3.1.1",r=function(a,b){return new r.fn.init(a,b)},s=/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,t=/^-ms-/,u=/-([a-z])/g,v=function(a,b){return b.toUpperCase()};r.fn=r.prototype={jquery:q,constructor:r,length:0,toArray:function(){return f.call(this)},get:function(a){return null==a?f.call(this):a<0?this[a+this.length]:this[a]},pushStack:function(a){var b=r.merge(this.constructor(),a);return b.prevObject=this,b},each:function(a){return r.each(this,a)},map:function(a){return this.pushStack(r.map(this,function(b,c){return a.call(b,c,b)}))},slice:function(){return this.pushStack(f.apply(this,arguments))},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},eq:function(a){var b=this.length,c=+a+(a<0?b:0);return this.pushStack(c>=0&&c<b?[this[c]]:[])},end:function(){return this.prevObject||this.constructor()},push:h,sort:c.sort,splice:c.splice},r.extend=r.fn.extend=function(){var a,b,c,d,e,f,g=arguments[0]||{},h=1,i=arguments.length,j=!1;for("boolean"==typeof g&&(j=g,g=arguments[h]||{},h++),"object"==typeof g||r.isFunction(g)||(g={}),h===i&&(g=this,h--);h<i;h++)if(null!=(a=arguments[h]))for(b in a)c=g[b],d=a[b],g!==d&&(j&&d&&(r.isPlainObject(d)||(e=r.isArray(d)))?(e?(e=!1,f=c&&r.isArray(c)?c:[]):f=c&&r.isPlainObject(c)?c:{},g[b]=r.extend(j,f,d)):void 0!==d&&(g[b]=d));return g},r.extend({expando:"jQuery"+(q+Math.random()).replace(/\D/g,""),isReady:!0,error:function(a){throw new Error(a)},noop:function(){},isFunction:function(a){return"function"===r.type(a)},isArray:Array.isArray,isWindow:function(a){return null!=a&&a===a.window},isNumeric:function(a){var b=r.type(a);return("number"===b||"string"===b)&&!isNaN(a-parseFloat(a))},isPlainObject:function(a){var b,c;return!(!a||"[object Object]"!==k.call(a))&&(!(b=e(a))||(c=l.call(b,"constructor")&&b.constructor,"function"==typeof c&&m.call(c)===n))},isEmptyObject:function(a){var b;for(b in a)return!1;return!0},type:function(a){return null==a?a+"":"object"==typeof a||"function"==typeof a?j[k.call(a)]||"object":typeof a},globalEval:function(a){p(a)},camelCase:function(a){return a.replace(t,"ms-").replace(u,v)},nodeName:function(a,b){return a.nodeName&&a.nodeName.toLowerCase()===b.toLowerCase()},each:function(a,b){var c,d=0;if(w(a)){for(c=a.length;d<c;d++)if(b.call(a[d],d,a[d])===!1)break}else for(d in a)if(b.call(a[d],d,a[d])===!1)break;return a},trim:function(a){return null==a?"":(a+"").replace(s,"")},makeArray:function(a,b){var c=b||[];return null!=a&&(w(Object(a))?r.merge(c,"string"==typeof a?[a]:a):h.call(c,a)),c},inArray:function(a,b,c){return null==b?-1:i.call(b,a,c)},merge:function(a,b){for(var c=+b.length,d=0,e=a.length;d<c;d++)a[e++]=b[d];return a.length=e,a},grep:function(a,b,c){for(var d,e=[],f=0,g=a.length,h=!c;f<g;f++)d=!b(a[f],f),d!==h&&e.push(a[f]);return e},map:function(a,b,c){var d,e,f=0,h=[];if(w(a))for(d=a.length;f<d;f++)e=b(a[f],f,c),null!=e&&h.push(e);else for(f in a)e=b(a[f],f,c),null!=e&&h.push(e);return g.apply([],h)},guid:1,proxy:function(a,b){var c,d,e;if("string"==typeof b&&(c=a[b],b=a,a=c),r.isFunction(a))return d=f.call(arguments,2),e=function(){return a.apply(b||this,d.concat(f.call(arguments)))},e.guid=a.guid=a.guid||r.guid++,e},now:Date.now,support:o}),"function"==typeof Symbol&&(r.fn[Symbol.iterator]=c[Symbol.iterator]),r.each("Boolean Number String Function Array Date RegExp Object Error Symbol".split(" "),function(a,b){j["[object "+b+"]"]=b.toLowerCase()});function w(a){var b=!!a&&"length"in a&&a.length,c=r.type(a);return"function"!==c&&!r.isWindow(a)&&("array"===c||0===b||"number"==typeof b&&b>0&&b-1 in a)}var x=function(a){var b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u="sizzle"+1*new Date,v=a.document,w=0,x=0,y=ha(),z=ha(),A=ha(),B=function(a,b){return a===b&&(l=!0),0},C={}.hasOwnProperty,D=[],E=D.pop,F=D.push,G=D.push,H=D.slice,I=function(a,b){for(var c=0,d=a.length;c<d;c++)if(a[c]===b)return c;return-1},J="checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",K="[\\x20\\t\\r\\n\\f]",L="(?:\\\\.|[\\w-]|[^\0-\\xa0])+",M="\\["+K+"*("+L+")(?:"+K+"*([*^$|!~]?=)"+K+"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|("+L+"))|)"+K+"*\\]",N=":("+L+")(?:\\((('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|((?:\\\\.|[^\\\\()[\\]]|"+M+")*)|.*)\\)|)",O=new RegExp(K+"+","g"),P=new RegExp("^"+K+"+|((?:^|[^\\\\])(?:\\\\.)*)"+K+"+$","g"),Q=new RegExp("^"+K+"*,"+K+"*"),R=new RegExp("^"+K+"*([>+~]|"+K+")"+K+"*"),S=new RegExp("="+K+"*([^\\]'\"]*?)"+K+"*\\]","g"),T=new RegExp(N),U=new RegExp("^"+L+"$"),V={ID:new RegExp("^#("+L+")"),CLASS:new RegExp("^\\.("+L+")"),TAG:new RegExp("^("+L+"|[*])"),ATTR:new RegExp("^"+M),PSEUDO:new RegExp("^"+N),CHILD:new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+K+"*(even|odd|(([+-]|)(\\d*)n|)"+K+"*(?:([+-]|)"+K+"*(\\d+)|))"+K+"*\\)|)","i"),bool:new RegExp("^(?:"+J+")$","i"),needsContext:new RegExp("^"+K+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+K+"*((?:-\\d)?\\d*)"+K+"*\\)|)(?=[^-]|$)","i")},W=/^(?:input|select|textarea|button)$/i,X=/^h\d$/i,Y=/^[^{]+\{\s*\[native \w/,Z=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,$=/[+~]/,_=new RegExp("\\\\([\\da-f]{1,6}"+K+"?|("+K+")|.)","ig"),aa=function(a,b,c){var d="0x"+b-65536;return d!==d||c?b:d<0?String.fromCharCode(d+65536):String.fromCharCode(d>>10|55296,1023&d|56320)},ba=/([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,ca=function(a,b){return b?"\0"===a?"\ufffd":a.slice(0,-1)+"\\"+a.charCodeAt(a.length-1).toString(16)+" ":"\\"+a},da=function(){m()},ea=ta(function(a){return a.disabled===!0&&("form"in a||"label"in a)},{dir:"parentNode",next:"legend"});try{G.apply(D=H.call(v.childNodes),v.childNodes),D[v.childNodes.length].nodeType}catch(fa){G={apply:D.length?function(a,b){F.apply(a,H.call(b))}:function(a,b){var c=a.length,d=0;while(a[c++]=b[d++]);a.length=c-1}}}function ga(a,b,d,e){var f,h,j,k,l,o,r,s=b&&b.ownerDocument,w=b?b.nodeType:9;if(d=d||[],"string"!=typeof a||!a||1!==w&&9!==w&&11!==w)return d;if(!e&&((b?b.ownerDocument||b:v)!==n&&m(b),b=b||n,p)){if(11!==w&&(l=Z.exec(a)))if(f=l[1]){if(9===w){if(!(j=b.getElementById(f)))return d;if(j.id===f)return d.push(j),d}else if(s&&(j=s.getElementById(f))&&t(b,j)&&j.id===f)return d.push(j),d}else{if(l[2])return G.apply(d,b.getElementsByTagName(a)),d;if((f=l[3])&&c.getElementsByClassName&&b.getElementsByClassName)return G.apply(d,b.getElementsByClassName(f)),d}if(c.qsa&&!A[a+" "]&&(!q||!q.test(a))){if(1!==w)s=b,r=a;else if("object"!==b.nodeName.toLowerCase()){(k=b.getAttribute("id"))?k=k.replace(ba,ca):b.setAttribute("id",k=u),o=g(a),h=o.length;while(h--)o[h]="#"+k+" "+sa(o[h]);r=o.join(","),s=$.test(a)&&qa(b.parentNode)||b}if(r)try{return G.apply(d,s.querySelectorAll(r)),d}catch(x){}finally{k===u&&b.removeAttribute("id")}}}return i(a.replace(P,"$1"),b,d,e)}function ha(){var a=[];function b(c,e){return a.push(c+" ")>d.cacheLength&&delete b[a.shift()],b[c+" "]=e}return b}function ia(a){return a[u]=!0,a}function ja(a){var b=n.createElement("fieldset");try{return!!a(b)}catch(c){return!1}finally{b.parentNode&&b.parentNode.removeChild(b),b=null}}function ka(a,b){var c=a.split("|"),e=c.length;while(e--)d.attrHandle[c[e]]=b}function la(a,b){var c=b&&a,d=c&&1===a.nodeType&&1===b.nodeType&&a.sourceIndex-b.sourceIndex;if(d)return d;if(c)while(c=c.nextSibling)if(c===b)return-1;return a?1:-1}function ma(a){return function(b){var c=b.nodeName.toLowerCase();return"input"===c&&b.type===a}}function na(a){return function(b){var c=b.nodeName.toLowerCase();return("input"===c||"button"===c)&&b.type===a}}function oa(a){return function(b){return"form"in b?b.parentNode&&b.disabled===!1?"label"in b?"label"in b.parentNode?b.parentNode.disabled===a:b.disabled===a:b.isDisabled===a||b.isDisabled!==!a&&ea(b)===a:b.disabled===a:"label"in b&&b.disabled===a}}function pa(a){return ia(function(b){return b=+b,ia(function(c,d){var e,f=a([],c.length,b),g=f.length;while(g--)c[e=f[g]]&&(c[e]=!(d[e]=c[e]))})})}function qa(a){return a&&"undefined"!=typeof a.getElementsByTagName&&a}c=ga.support={},f=ga.isXML=function(a){var b=a&&(a.ownerDocument||a).documentElement;return!!b&&"HTML"!==b.nodeName},m=ga.setDocument=function(a){var b,e,g=a?a.ownerDocument||a:v;return g!==n&&9===g.nodeType&&g.documentElement?(n=g,o=n.documentElement,p=!f(n),v!==n&&(e=n.defaultView)&&e.top!==e&&(e.addEventListener?e.addEventListener("unload",da,!1):e.attachEvent&&e.attachEvent("onunload",da)),c.attributes=ja(function(a){return a.className="i",!a.getAttribute("className")}),c.getElementsByTagName=ja(function(a){return a.appendChild(n.createComment("")),!a.getElementsByTagName("*").length}),c.getElementsByClassName=Y.test(n.getElementsByClassName),c.getById=ja(function(a){return o.appendChild(a).id=u,!n.getElementsByName||!n.getElementsByName(u).length}),c.getById?(d.filter.ID=function(a){var b=a.replace(_,aa);return function(a){return a.getAttribute("id")===b}},d.find.ID=function(a,b){if("undefined"!=typeof b.getElementById&&p){var c=b.getElementById(a);return c?[c]:[]}}):(d.filter.ID=function(a){var b=a.replace(_,aa);return function(a){var c="undefined"!=typeof a.getAttributeNode&&a.getAttributeNode("id");return c&&c.value===b}},d.find.ID=function(a,b){if("undefined"!=typeof b.getElementById&&p){var c,d,e,f=b.getElementById(a);if(f){if(c=f.getAttributeNode("id"),c&&c.value===a)return[f];e=b.getElementsByName(a),d=0;while(f=e[d++])if(c=f.getAttributeNode("id"),c&&c.value===a)return[f]}return[]}}),d.find.TAG=c.getElementsByTagName?function(a,b){return"undefined"!=typeof b.getElementsByTagName?b.getElementsByTagName(a):c.qsa?b.querySelectorAll(a):void 0}:function(a,b){var c,d=[],e=0,f=b.getElementsByTagName(a);if("*"===a){while(c=f[e++])1===c.nodeType&&d.push(c);return d}return f},d.find.CLASS=c.getElementsByClassName&&function(a,b){if("undefined"!=typeof b.getElementsByClassName&&p)return b.getElementsByClassName(a)},r=[],q=[],(c.qsa=Y.test(n.querySelectorAll))&&(ja(function(a){o.appendChild(a).innerHTML="<a id='"+u+"'></a><select id='"+u+"-\r\\' msallowcapture=''><option selected=''></option></select>",a.querySelectorAll("[msallowcapture^='']").length&&q.push("[*^$]="+K+"*(?:''|\"\")"),a.querySelectorAll("[selected]").length||q.push("\\["+K+"*(?:value|"+J+")"),a.querySelectorAll("[id~="+u+"-]").length||q.push("~="),a.querySelectorAll(":checked").length||q.push(":checked"),a.querySelectorAll("a#"+u+"+*").length||q.push(".#.+[+~]")}),ja(function(a){a.innerHTML="<a href='' disabled='disabled'></a><select disabled='disabled'><option/></select>";var b=n.createElement("input");b.setAttribute("type","hidden"),a.appendChild(b).setAttribute("name","D"),a.querySelectorAll("[name=d]").length&&q.push("name"+K+"*[*^$|!~]?="),2!==a.querySelectorAll(":enabled").length&&q.push(":enabled",":disabled"),o.appendChild(a).disabled=!0,2!==a.querySelectorAll(":disabled").length&&q.push(":enabled",":disabled"),a.querySelectorAll("*,:x"),q.push(",.*:")})),(c.matchesSelector=Y.test(s=o.matches||o.webkitMatchesSelector||o.mozMatchesSelector||o.oMatchesSelector||o.msMatchesSelector))&&ja(function(a){c.disconnectedMatch=s.call(a,"*"),s.call(a,"[s!='']:x"),r.push("!=",N)}),q=q.length&&new RegExp(q.join("|")),r=r.length&&new RegExp(r.join("|")),b=Y.test(o.compareDocumentPosition),t=b||Y.test(o.contains)?function(a,b){var c=9===a.nodeType?a.documentElement:a,d=b&&b.parentNode;return a===d||!(!d||1!==d.nodeType||!(c.contains?c.contains(d):a.compareDocumentPosition&&16&a.compareDocumentPosition(d)))}:function(a,b){if(b)while(b=b.parentNode)if(b===a)return!0;return!1},B=b?function(a,b){if(a===b)return l=!0,0;var d=!a.compareDocumentPosition-!b.compareDocumentPosition;return d?d:(d=(a.ownerDocument||a)===(b.ownerDocument||b)?a.compareDocumentPosition(b):1,1&d||!c.sortDetached&&b.compareDocumentPosition(a)===d?a===n||a.ownerDocument===v&&t(v,a)?-1:b===n||b.ownerDocument===v&&t(v,b)?1:k?I(k,a)-I(k,b):0:4&d?-1:1)}:function(a,b){if(a===b)return l=!0,0;var c,d=0,e=a.parentNode,f=b.parentNode,g=[a],h=[b];if(!e||!f)return a===n?-1:b===n?1:e?-1:f?1:k?I(k,a)-I(k,b):0;if(e===f)return la(a,b);c=a;while(c=c.parentNode)g.unshift(c);c=b;while(c=c.parentNode)h.unshift(c);while(g[d]===h[d])d++;return d?la(g[d],h[d]):g[d]===v?-1:h[d]===v?1:0},n):n},ga.matches=function(a,b){return ga(a,null,null,b)},ga.matchesSelector=function(a,b){if((a.ownerDocument||a)!==n&&m(a),b=b.replace(S,"='$1']"),c.matchesSelector&&p&&!A[b+" "]&&(!r||!r.test(b))&&(!q||!q.test(b)))try{var d=s.call(a,b);if(d||c.disconnectedMatch||a.document&&11!==a.document.nodeType)return d}catch(e){}return ga(b,n,null,[a]).length>0},ga.contains=function(a,b){return(a.ownerDocument||a)!==n&&m(a),t(a,b)},ga.attr=function(a,b){(a.ownerDocument||a)!==n&&m(a);var e=d.attrHandle[b.toLowerCase()],f=e&&C.call(d.attrHandle,b.toLowerCase())?e(a,b,!p):void 0;return void 0!==f?f:c.attributes||!p?a.getAttribute(b):(f=a.getAttributeNode(b))&&f.specified?f.value:null},ga.escape=function(a){return(a+"").replace(ba,ca)},ga.error=function(a){throw new Error("Syntax error, unrecognized expression: "+a)},ga.uniqueSort=function(a){var b,d=[],e=0,f=0;if(l=!c.detectDuplicates,k=!c.sortStable&&a.slice(0),a.sort(B),l){while(b=a[f++])b===a[f]&&(e=d.push(f));while(e--)a.splice(d[e],1)}return k=null,a},e=ga.getText=function(a){var b,c="",d=0,f=a.nodeType;if(f){if(1===f||9===f||11===f){if("string"==typeof a.textContent)return a.textContent;for(a=a.firstChild;a;a=a.nextSibling)c+=e(a)}else if(3===f||4===f)return a.nodeValue}else while(b=a[d++])c+=e(b);return c},d=ga.selectors={cacheLength:50,createPseudo:ia,match:V,attrHandle:{},find:{},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(a){return a[1]=a[1].replace(_,aa),a[3]=(a[3]||a[4]||a[5]||"").replace(_,aa),"~="===a[2]&&(a[3]=" "+a[3]+" "),a.slice(0,4)},CHILD:function(a){return a[1]=a[1].toLowerCase(),"nth"===a[1].slice(0,3)?(a[3]||ga.error(a[0]),a[4]=+(a[4]?a[5]+(a[6]||1):2*("even"===a[3]||"odd"===a[3])),a[5]=+(a[7]+a[8]||"odd"===a[3])):a[3]&&ga.error(a[0]),a},PSEUDO:function(a){var b,c=!a[6]&&a[2];return V.CHILD.test(a[0])?null:(a[3]?a[2]=a[4]||a[5]||"":c&&T.test(c)&&(b=g(c,!0))&&(b=c.indexOf(")",c.length-b)-c.length)&&(a[0]=a[0].slice(0,b),a[2]=c.slice(0,b)),a.slice(0,3))}},filter:{TAG:function(a){var b=a.replace(_,aa).toLowerCase();return"*"===a?function(){return!0}:function(a){return a.nodeName&&a.nodeName.toLowerCase()===b}},CLASS:function(a){var b=y[a+" "];return b||(b=new RegExp("(^|"+K+")"+a+"("+K+"|$)"))&&y(a,function(a){return b.test("string"==typeof a.className&&a.className||"undefined"!=typeof a.getAttribute&&a.getAttribute("class")||"")})},ATTR:function(a,b,c){return function(d){var e=ga.attr(d,a);return null==e?"!="===b:!b||(e+="","="===b?e===c:"!="===b?e!==c:"^="===b?c&&0===e.indexOf(c):"*="===b?c&&e.indexOf(c)>-1:"$="===b?c&&e.slice(-c.length)===c:"~="===b?(" "+e.replace(O," ")+" ").indexOf(c)>-1:"|="===b&&(e===c||e.slice(0,c.length+1)===c+"-"))}},CHILD:function(a,b,c,d,e){var f="nth"!==a.slice(0,3),g="last"!==a.slice(-4),h="of-type"===b;return 1===d&&0===e?function(a){return!!a.parentNode}:function(b,c,i){var j,k,l,m,n,o,p=f!==g?"nextSibling":"previousSibling",q=b.parentNode,r=h&&b.nodeName.toLowerCase(),s=!i&&!h,t=!1;if(q){if(f){while(p){m=b;while(m=m[p])if(h?m.nodeName.toLowerCase()===r:1===m.nodeType)return!1;o=p="only"===a&&!o&&"nextSibling"}return!0}if(o=[g?q.firstChild:q.lastChild],g&&s){m=q,l=m[u]||(m[u]={}),k=l[m.uniqueID]||(l[m.uniqueID]={}),j=k[a]||[],n=j[0]===w&&j[1],t=n&&j[2],m=n&&q.childNodes[n];while(m=++n&&m&&m[p]||(t=n=0)||o.pop())if(1===m.nodeType&&++t&&m===b){k[a]=[w,n,t];break}}else if(s&&(m=b,l=m[u]||(m[u]={}),k=l[m.uniqueID]||(l[m.uniqueID]={}),j=k[a]||[],n=j[0]===w&&j[1],t=n),t===!1)while(m=++n&&m&&m[p]||(t=n=0)||o.pop())if((h?m.nodeName.toLowerCase()===r:1===m.nodeType)&&++t&&(s&&(l=m[u]||(m[u]={}),k=l[m.uniqueID]||(l[m.uniqueID]={}),k[a]=[w,t]),m===b))break;return t-=e,t===d||t%d===0&&t/d>=0}}},PSEUDO:function(a,b){var c,e=d.pseudos[a]||d.setFilters[a.toLowerCase()]||ga.error("unsupported pseudo: "+a);return e[u]?e(b):e.length>1?(c=[a,a,"",b],d.setFilters.hasOwnProperty(a.toLowerCase())?ia(function(a,c){var d,f=e(a,b),g=f.length;while(g--)d=I(a,f[g]),a[d]=!(c[d]=f[g])}):function(a){return e(a,0,c)}):e}},pseudos:{not:ia(function(a){var b=[],c=[],d=h(a.replace(P,"$1"));return d[u]?ia(function(a,b,c,e){var f,g=d(a,null,e,[]),h=a.length;while(h--)(f=g[h])&&(a[h]=!(b[h]=f))}):function(a,e,f){return b[0]=a,d(b,null,f,c),b[0]=null,!c.pop()}}),has:ia(function(a){return function(b){return ga(a,b).length>0}}),contains:ia(function(a){return a=a.replace(_,aa),function(b){return(b.textContent||b.innerText||e(b)).indexOf(a)>-1}}),lang:ia(function(a){return U.test(a||"")||ga.error("unsupported lang: "+a),a=a.replace(_,aa).toLowerCase(),function(b){var c;do if(c=p?b.lang:b.getAttribute("xml:lang")||b.getAttribute("lang"))return c=c.toLowerCase(),c===a||0===c.indexOf(a+"-");while((b=b.parentNode)&&1===b.nodeType);return!1}}),target:function(b){var c=a.location&&a.location.hash;return c&&c.slice(1)===b.id},root:function(a){return a===o},focus:function(a){return a===n.activeElement&&(!n.hasFocus||n.hasFocus())&&!!(a.type||a.href||~a.tabIndex)},enabled:oa(!1),disabled:oa(!0),checked:function(a){var b=a.nodeName.toLowerCase();return"input"===b&&!!a.checked||"option"===b&&!!a.selected},selected:function(a){return a.parentNode&&a.parentNode.selectedIndex,a.selected===!0},empty:function(a){for(a=a.firstChild;a;a=a.nextSibling)if(a.nodeType<6)return!1;return!0},parent:function(a){return!d.pseudos.empty(a)},header:function(a){return X.test(a.nodeName)},input:function(a){return W.test(a.nodeName)},button:function(a){var b=a.nodeName.toLowerCase();return"input"===b&&"button"===a.type||"button"===b},text:function(a){var b;return"input"===a.nodeName.toLowerCase()&&"text"===a.type&&(null==(b=a.getAttribute("type"))||"text"===b.toLowerCase())},first:pa(function(){return[0]}),last:pa(function(a,b){return[b-1]}),eq:pa(function(a,b,c){return[c<0?c+b:c]}),even:pa(function(a,b){for(var c=0;c<b;c+=2)a.push(c);return a}),odd:pa(function(a,b){for(var c=1;c<b;c+=2)a.push(c);return a}),lt:pa(function(a,b,c){for(var d=c<0?c+b:c;--d>=0;)a.push(d);return a}),gt:pa(function(a,b,c){for(var d=c<0?c+b:c;++d<b;)a.push(d);return a})}},d.pseudos.nth=d.pseudos.eq;for(b in{radio:!0,checkbox:!0,file:!0,password:!0,image:!0})d.pseudos[b]=ma(b);for(b in{submit:!0,reset:!0})d.pseudos[b]=na(b);function ra(){}ra.prototype=d.filters=d.pseudos,d.setFilters=new ra,g=ga.tokenize=function(a,b){var c,e,f,g,h,i,j,k=z[a+" "];if(k)return b?0:k.slice(0);h=a,i=[],j=d.preFilter;while(h){c&&!(e=Q.exec(h))||(e&&(h=h.slice(e[0].length)||h),i.push(f=[])),c=!1,(e=R.exec(h))&&(c=e.shift(),f.push({value:c,type:e[0].replace(P," ")}),h=h.slice(c.length));for(g in d.filter)!(e=V[g].exec(h))||j[g]&&!(e=j[g](e))||(c=e.shift(),f.push({value:c,type:g,matches:e}),h=h.slice(c.length));if(!c)break}return b?h.length:h?ga.error(a):z(a,i).slice(0)};function sa(a){for(var b=0,c=a.length,d="";b<c;b++)d+=a[b].value;return d}function ta(a,b,c){var d=b.dir,e=b.next,f=e||d,g=c&&"parentNode"===f,h=x++;return b.first?function(b,c,e){while(b=b[d])if(1===b.nodeType||g)return a(b,c,e);return!1}:function(b,c,i){var j,k,l,m=[w,h];if(i){while(b=b[d])if((1===b.nodeType||g)&&a(b,c,i))return!0}else while(b=b[d])if(1===b.nodeType||g)if(l=b[u]||(b[u]={}),k=l[b.uniqueID]||(l[b.uniqueID]={}),e&&e===b.nodeName.toLowerCase())b=b[d]||b;else{if((j=k[f])&&j[0]===w&&j[1]===h)return m[2]=j[2];if(k[f]=m,m[2]=a(b,c,i))return!0}return!1}}function ua(a){return a.length>1?function(b,c,d){var e=a.length;while(e--)if(!a[e](b,c,d))return!1;return!0}:a[0]}function va(a,b,c){for(var d=0,e=b.length;d<e;d++)ga(a,b[d],c);return c}function wa(a,b,c,d,e){for(var f,g=[],h=0,i=a.length,j=null!=b;h<i;h++)(f=a[h])&&(c&&!c(f,d,e)||(g.push(f),j&&b.push(h)));return g}function xa(a,b,c,d,e,f){return d&&!d[u]&&(d=xa(d)),e&&!e[u]&&(e=xa(e,f)),ia(function(f,g,h,i){var j,k,l,m=[],n=[],o=g.length,p=f||va(b||"*",h.nodeType?[h]:h,[]),q=!a||!f&&b?p:wa(p,m,a,h,i),r=c?e||(f?a:o||d)?[]:g:q;if(c&&c(q,r,h,i),d){j=wa(r,n),d(j,[],h,i),k=j.length;while(k--)(l=j[k])&&(r[n[k]]=!(q[n[k]]=l))}if(f){if(e||a){if(e){j=[],k=r.length;while(k--)(l=r[k])&&j.push(q[k]=l);e(null,r=[],j,i)}k=r.length;while(k--)(l=r[k])&&(j=e?I(f,l):m[k])>-1&&(f[j]=!(g[j]=l))}}else r=wa(r===g?r.splice(o,r.length):r),e?e(null,g,r,i):G.apply(g,r)})}function ya(a){for(var b,c,e,f=a.length,g=d.relative[a[0].type],h=g||d.relative[" "],i=g?1:0,k=ta(function(a){return a===b},h,!0),l=ta(function(a){return I(b,a)>-1},h,!0),m=[function(a,c,d){var e=!g&&(d||c!==j)||((b=c).nodeType?k(a,c,d):l(a,c,d));return b=null,e}];i<f;i++)if(c=d.relative[a[i].type])m=[ta(ua(m),c)];else{if(c=d.filter[a[i].type].apply(null,a[i].matches),c[u]){for(e=++i;e<f;e++)if(d.relative[a[e].type])break;return xa(i>1&&ua(m),i>1&&sa(a.slice(0,i-1).concat({value:" "===a[i-2].type?"*":""})).replace(P,"$1"),c,i<e&&ya(a.slice(i,e)),e<f&&ya(a=a.slice(e)),e<f&&sa(a))}m.push(c)}return ua(m)}function za(a,b){var c=b.length>0,e=a.length>0,f=function(f,g,h,i,k){var l,o,q,r=0,s="0",t=f&&[],u=[],v=j,x=f||e&&d.find.TAG("*",k),y=w+=null==v?1:Math.random()||.1,z=x.length;for(k&&(j=g===n||g||k);s!==z&&null!=(l=x[s]);s++){if(e&&l){o=0,g||l.ownerDocument===n||(m(l),h=!p);while(q=a[o++])if(q(l,g||n,h)){i.push(l);break}k&&(w=y)}c&&((l=!q&&l)&&r--,f&&t.push(l))}if(r+=s,c&&s!==r){o=0;while(q=b[o++])q(t,u,g,h);if(f){if(r>0)while(s--)t[s]||u[s]||(u[s]=E.call(i));u=wa(u)}G.apply(i,u),k&&!f&&u.length>0&&r+b.length>1&&ga.uniqueSort(i)}return k&&(w=y,j=v),t};return c?ia(f):f}return h=ga.compile=function(a,b){var c,d=[],e=[],f=A[a+" "];if(!f){b||(b=g(a)),c=b.length;while(c--)f=ya(b[c]),f[u]?d.push(f):e.push(f);f=A(a,za(e,d)),f.selector=a}return f},i=ga.select=function(a,b,c,e){var f,i,j,k,l,m="function"==typeof a&&a,n=!e&&g(a=m.selector||a);if(c=c||[],1===n.length){if(i=n[0]=n[0].slice(0),i.length>2&&"ID"===(j=i[0]).type&&9===b.nodeType&&p&&d.relative[i[1].type]){if(b=(d.find.ID(j.matches[0].replace(_,aa),b)||[])[0],!b)return c;m&&(b=b.parentNode),a=a.slice(i.shift().value.length)}f=V.needsContext.test(a)?0:i.length;while(f--){if(j=i[f],d.relative[k=j.type])break;if((l=d.find[k])&&(e=l(j.matches[0].replace(_,aa),$.test(i[0].type)&&qa(b.parentNode)||b))){if(i.splice(f,1),a=e.length&&sa(i),!a)return G.apply(c,e),c;break}}}return(m||h(a,n))(e,b,!p,c,!b||$.test(a)&&qa(b.parentNode)||b),c},c.sortStable=u.split("").sort(B).join("")===u,c.detectDuplicates=!!l,m(),c.sortDetached=ja(function(a){return 1&a.compareDocumentPosition(n.createElement("fieldset"))}),ja(function(a){return a.innerHTML="<a href='#'></a>","#"===a.firstChild.getAttribute("href")})||ka("type|href|height|width",function(a,b,c){if(!c)return a.getAttribute(b,"type"===b.toLowerCase()?1:2)}),c.attributes&&ja(function(a){return a.innerHTML="<input/>",a.firstChild.setAttribute("value",""),""===a.firstChild.getAttribute("value")})||ka("value",function(a,b,c){if(!c&&"input"===a.nodeName.toLowerCase())return a.defaultValue}),ja(function(a){return null==a.getAttribute("disabled")})||ka(J,function(a,b,c){var d;if(!c)return a[b]===!0?b.toLowerCase():(d=a.getAttributeNode(b))&&d.specified?d.value:null}),ga}(a);r.find=x,r.expr=x.selectors,r.expr[":"]=r.expr.pseudos,r.uniqueSort=r.unique=x.uniqueSort,r.text=x.getText,r.isXMLDoc=x.isXML,r.contains=x.contains,r.escapeSelector=x.escape;var y=function(a,b,c){var d=[],e=void 0!==c;while((a=a[b])&&9!==a.nodeType)if(1===a.nodeType){if(e&&r(a).is(c))break;d.push(a)}return d},z=function(a,b){for(var c=[];a;a=a.nextSibling)1===a.nodeType&&a!==b&&c.push(a);return c},A=r.expr.match.needsContext,B=/^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i,C=/^.[^:#\[\.,]*$/;function D(a,b,c){return r.isFunction(b)?r.grep(a,function(a,d){return!!b.call(a,d,a)!==c}):b.nodeType?r.grep(a,function(a){return a===b!==c}):"string"!=typeof b?r.grep(a,function(a){return i.call(b,a)>-1!==c}):C.test(b)?r.filter(b,a,c):(b=r.filter(b,a),r.grep(a,function(a){return i.call(b,a)>-1!==c&&1===a.nodeType}))}r.filter=function(a,b,c){var d=b[0];return c&&(a=":not("+a+")"),1===b.length&&1===d.nodeType?r.find.matchesSelector(d,a)?[d]:[]:r.find.matches(a,r.grep(b,function(a){return 1===a.nodeType}))},r.fn.extend({find:function(a){var b,c,d=this.length,e=this;if("string"!=typeof a)return this.pushStack(r(a).filter(function(){for(b=0;b<d;b++)if(r.contains(e[b],this))return!0}));for(c=this.pushStack([]),b=0;b<d;b++)r.find(a,e[b],c);return d>1?r.uniqueSort(c):c},filter:function(a){return this.pushStack(D(this,a||[],!1))},not:function(a){return this.pushStack(D(this,a||[],!0))},is:function(a){return!!D(this,"string"==typeof a&&A.test(a)?r(a):a||[],!1).length}});var E,F=/^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,G=r.fn.init=function(a,b,c){var e,f;if(!a)return this;if(c=c||E,"string"==typeof a){if(e="<"===a[0]&&">"===a[a.length-1]&&a.length>=3?[null,a,null]:F.exec(a),!e||!e[1]&&b)return!b||b.jquery?(b||c).find(a):this.constructor(b).find(a);if(e[1]){if(b=b instanceof r?b[0]:b,r.merge(this,r.parseHTML(e[1],b&&b.nodeType?b.ownerDocument||b:d,!0)),B.test(e[1])&&r.isPlainObject(b))for(e in b)r.isFunction(this[e])?this[e](b[e]):this.attr(e,b[e]);return this}return f=d.getElementById(e[2]),f&&(this[0]=f,this.length=1),this}return a.nodeType?(this[0]=a,this.length=1,this):r.isFunction(a)?void 0!==c.ready?c.ready(a):a(r):r.makeArray(a,this)};G.prototype=r.fn,E=r(d);var H=/^(?:parents|prev(?:Until|All))/,I={children:!0,contents:!0,next:!0,prev:!0};r.fn.extend({has:function(a){var b=r(a,this),c=b.length;return this.filter(function(){for(var a=0;a<c;a++)if(r.contains(this,b[a]))return!0})},closest:function(a,b){var c,d=0,e=this.length,f=[],g="string"!=typeof a&&r(a);if(!A.test(a))for(;d<e;d++)for(c=this[d];c&&c!==b;c=c.parentNode)if(c.nodeType<11&&(g?g.index(c)>-1:1===c.nodeType&&r.find.matchesSelector(c,a))){f.push(c);break}return this.pushStack(f.length>1?r.uniqueSort(f):f)},index:function(a){return a?"string"==typeof a?i.call(r(a),this[0]):i.call(this,a.jquery?a[0]:a):this[0]&&this[0].parentNode?this.first().prevAll().length:-1},add:function(a,b){return this.pushStack(r.uniqueSort(r.merge(this.get(),r(a,b))))},addBack:function(a){return this.add(null==a?this.prevObject:this.prevObject.filter(a))}});function J(a,b){while((a=a[b])&&1!==a.nodeType);return a}r.each({parent:function(a){var b=a.parentNode;return b&&11!==b.nodeType?b:null},parents:function(a){return y(a,"parentNode")},parentsUntil:function(a,b,c){return y(a,"parentNode",c)},next:function(a){return J(a,"nextSibling")},prev:function(a){return J(a,"previousSibling")},nextAll:function(a){return y(a,"nextSibling")},prevAll:function(a){return y(a,"previousSibling")},nextUntil:function(a,b,c){return y(a,"nextSibling",c)},prevUntil:function(a,b,c){return y(a,"previousSibling",c)},siblings:function(a){return z((a.parentNode||{}).firstChild,a)},children:function(a){return z(a.firstChild)},contents:function(a){return a.contentDocument||r.merge([],a.childNodes)}},function(a,b){r.fn[a]=function(c,d){var e=r.map(this,b,c);return"Until"!==a.slice(-5)&&(d=c),d&&"string"==typeof d&&(e=r.filter(d,e)),this.length>1&&(I[a]||r.uniqueSort(e),H.test(a)&&e.reverse()),this.pushStack(e)}});var K=/[^\x20\t\r\n\f]+/g;function L(a){var b={};return r.each(a.match(K)||[],function(a,c){b[c]=!0}),b}r.Callbacks=function(a){a="string"==typeof a?L(a):r.extend({},a);var b,c,d,e,f=[],g=[],h=-1,i=function(){for(e=a.once,d=b=!0;g.length;h=-1){c=g.shift();while(++h<f.length)f[h].apply(c[0],c[1])===!1&&a.stopOnFalse&&(h=f.length,c=!1)}a.memory||(c=!1),b=!1,e&&(f=c?[]:"")},j={add:function(){return f&&(c&&!b&&(h=f.length-1,g.push(c)),function d(b){r.each(b,function(b,c){r.isFunction(c)?a.unique&&j.has(c)||f.push(c):c&&c.length&&"string"!==r.type(c)&&d(c)})}(arguments),c&&!b&&i()),this},remove:function(){return r.each(arguments,function(a,b){var c;while((c=r.inArray(b,f,c))>-1)f.splice(c,1),c<=h&&h--}),this},has:function(a){return a?r.inArray(a,f)>-1:f.length>0},empty:function(){return f&&(f=[]),this},disable:function(){return e=g=[],f=c="",this},disabled:function(){return!f},lock:function(){return e=g=[],c||b||(f=c=""),this},locked:function(){return!!e},fireWith:function(a,c){return e||(c=c||[],c=[a,c.slice?c.slice():c],g.push(c),b||i()),this},fire:function(){return j.fireWith(this,arguments),this},fired:function(){return!!d}};return j};function M(a){return a}function N(a){throw a}function O(a,b,c){var d;try{a&&r.isFunction(d=a.promise)?d.call(a).done(b).fail(c):a&&r.isFunction(d=a.then)?d.call(a,b,c):b.call(void 0,a)}catch(a){c.call(void 0,a)}}r.extend({Deferred:function(b){var c=[["notify","progress",r.Callbacks("memory"),r.Callbacks("memory"),2],["resolve","done",r.Callbacks("once memory"),r.Callbacks("once memory"),0,"resolved"],["reject","fail",r.Callbacks("once memory"),r.Callbacks("once memory"),1,"rejected"]],d="pending",e={state:function(){return d},always:function(){return f.done(arguments).fail(arguments),this},"catch":function(a){return e.then(null,a)},pipe:function(){var a=arguments;return r.Deferred(function(b){r.each(c,function(c,d){var e=r.isFunction(a[d[4]])&&a[d[4]];f[d[1]](function(){var a=e&&e.apply(this,arguments);a&&r.isFunction(a.promise)?a.promise().progress(b.notify).done(b.resolve).fail(b.reject):b[d[0]+"With"](this,e?[a]:arguments)})}),a=null}).promise()},then:function(b,d,e){var f=0;function g(b,c,d,e){return function(){var h=this,i=arguments,j=function(){var a,j;if(!(b<f)){if(a=d.apply(h,i),a===c.promise())throw new TypeError("Thenable self-resolution");j=a&&("object"==typeof a||"function"==typeof a)&&a.then,r.isFunction(j)?e?j.call(a,g(f,c,M,e),g(f,c,N,e)):(f++,j.call(a,g(f,c,M,e),g(f,c,N,e),g(f,c,M,c.notifyWith))):(d!==M&&(h=void 0,i=[a]),(e||c.resolveWith)(h,i))}},k=e?j:function(){try{j()}catch(a){r.Deferred.exceptionHook&&r.Deferred.exceptionHook(a,k.stackTrace),b+1>=f&&(d!==N&&(h=void 0,i=[a]),c.rejectWith(h,i))}};b?k():(r.Deferred.getStackHook&&(k.stackTrace=r.Deferred.getStackHook()),a.setTimeout(k))}}return r.Deferred(function(a){c[0][3].add(g(0,a,r.isFunction(e)?e:M,a.notifyWith)),c[1][3].add(g(0,a,r.isFunction(b)?b:M)),c[2][3].add(g(0,a,r.isFunction(d)?d:N))}).promise()},promise:function(a){return null!=a?r.extend(a,e):e}},f={};return r.each(c,function(a,b){var g=b[2],h=b[5];e[b[1]]=g.add,h&&g.add(function(){d=h},c[3-a][2].disable,c[0][2].lock),g.add(b[3].fire),f[b[0]]=function(){return f[b[0]+"With"](this===f?void 0:this,arguments),this},f[b[0]+"With"]=g.fireWith}),e.promise(f),b&&b.call(f,f),f},when:function(a){var b=arguments.length,c=b,d=Array(c),e=f.call(arguments),g=r.Deferred(),h=function(a){return function(c){d[a]=this,e[a]=arguments.length>1?f.call(arguments):c,--b||g.resolveWith(d,e)}};if(b<=1&&(O(a,g.done(h(c)).resolve,g.reject),"pending"===g.state()||r.isFunction(e[c]&&e[c].then)))return g.then();while(c--)O(e[c],h(c),g.reject);return g.promise()}});var P=/^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;r.Deferred.exceptionHook=function(b,c){a.console&&a.console.warn&&b&&P.test(b.name)&&a.console.warn("jQuery.Deferred exception: "+b.message,b.stack,c)},r.readyException=function(b){a.setTimeout(function(){throw b})};var Q=r.Deferred();r.fn.ready=function(a){return Q.then(a)["catch"](function(a){r.readyException(a)}),this},r.extend({isReady:!1,readyWait:1,holdReady:function(a){a?r.readyWait++:r.ready(!0)},ready:function(a){(a===!0?--r.readyWait:r.isReady)||(r.isReady=!0,a!==!0&&--r.readyWait>0||Q.resolveWith(d,[r]))}}),r.ready.then=Q.then;function R(){d.removeEventListener("DOMContentLoaded",R),
a.removeEventListener("load",R),r.ready()}"complete"===d.readyState||"loading"!==d.readyState&&!d.documentElement.doScroll?a.setTimeout(r.ready):(d.addEventListener("DOMContentLoaded",R),a.addEventListener("load",R));var S=function(a,b,c,d,e,f,g){var h=0,i=a.length,j=null==c;if("object"===r.type(c)){e=!0;for(h in c)S(a,b,h,c[h],!0,f,g)}else if(void 0!==d&&(e=!0,r.isFunction(d)||(g=!0),j&&(g?(b.call(a,d),b=null):(j=b,b=function(a,b,c){return j.call(r(a),c)})),b))for(;h<i;h++)b(a[h],c,g?d:d.call(a[h],h,b(a[h],c)));return e?a:j?b.call(a):i?b(a[0],c):f},T=function(a){return 1===a.nodeType||9===a.nodeType||!+a.nodeType};function U(){this.expando=r.expando+U.uid++}U.uid=1,U.prototype={cache:function(a){var b=a[this.expando];return b||(b={},T(a)&&(a.nodeType?a[this.expando]=b:Object.defineProperty(a,this.expando,{value:b,configurable:!0}))),b},set:function(a,b,c){var d,e=this.cache(a);if("string"==typeof b)e[r.camelCase(b)]=c;else for(d in b)e[r.camelCase(d)]=b[d];return e},get:function(a,b){return void 0===b?this.cache(a):a[this.expando]&&a[this.expando][r.camelCase(b)]},access:function(a,b,c){return void 0===b||b&&"string"==typeof b&&void 0===c?this.get(a,b):(this.set(a,b,c),void 0!==c?c:b)},remove:function(a,b){var c,d=a[this.expando];if(void 0!==d){if(void 0!==b){r.isArray(b)?b=b.map(r.camelCase):(b=r.camelCase(b),b=b in d?[b]:b.match(K)||[]),c=b.length;while(c--)delete d[b[c]]}(void 0===b||r.isEmptyObject(d))&&(a.nodeType?a[this.expando]=void 0:delete a[this.expando])}},hasData:function(a){var b=a[this.expando];return void 0!==b&&!r.isEmptyObject(b)}};var V=new U,W=new U,X=/^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,Y=/[A-Z]/g;function Z(a){return"true"===a||"false"!==a&&("null"===a?null:a===+a+""?+a:X.test(a)?JSON.parse(a):a)}function $(a,b,c){var d;if(void 0===c&&1===a.nodeType)if(d="data-"+b.replace(Y,"-$&").toLowerCase(),c=a.getAttribute(d),"string"==typeof c){try{c=Z(c)}catch(e){}W.set(a,b,c)}else c=void 0;return c}r.extend({hasData:function(a){return W.hasData(a)||V.hasData(a)},data:function(a,b,c){return W.access(a,b,c)},removeData:function(a,b){W.remove(a,b)},_data:function(a,b,c){return V.access(a,b,c)},_removeData:function(a,b){V.remove(a,b)}}),r.fn.extend({data:function(a,b){var c,d,e,f=this[0],g=f&&f.attributes;if(void 0===a){if(this.length&&(e=W.get(f),1===f.nodeType&&!V.get(f,"hasDataAttrs"))){c=g.length;while(c--)g[c]&&(d=g[c].name,0===d.indexOf("data-")&&(d=r.camelCase(d.slice(5)),$(f,d,e[d])));V.set(f,"hasDataAttrs",!0)}return e}return"object"==typeof a?this.each(function(){W.set(this,a)}):S(this,function(b){var c;if(f&&void 0===b){if(c=W.get(f,a),void 0!==c)return c;if(c=$(f,a),void 0!==c)return c}else this.each(function(){W.set(this,a,b)})},null,b,arguments.length>1,null,!0)},removeData:function(a){return this.each(function(){W.remove(this,a)})}}),r.extend({queue:function(a,b,c){var d;if(a)return b=(b||"fx")+"queue",d=V.get(a,b),c&&(!d||r.isArray(c)?d=V.access(a,b,r.makeArray(c)):d.push(c)),d||[]},dequeue:function(a,b){b=b||"fx";var c=r.queue(a,b),d=c.length,e=c.shift(),f=r._queueHooks(a,b),g=function(){r.dequeue(a,b)};"inprogress"===e&&(e=c.shift(),d--),e&&("fx"===b&&c.unshift("inprogress"),delete f.stop,e.call(a,g,f)),!d&&f&&f.empty.fire()},_queueHooks:function(a,b){var c=b+"queueHooks";return V.get(a,c)||V.access(a,c,{empty:r.Callbacks("once memory").add(function(){V.remove(a,[b+"queue",c])})})}}),r.fn.extend({queue:function(a,b){var c=2;return"string"!=typeof a&&(b=a,a="fx",c--),arguments.length<c?r.queue(this[0],a):void 0===b?this:this.each(function(){var c=r.queue(this,a,b);r._queueHooks(this,a),"fx"===a&&"inprogress"!==c[0]&&r.dequeue(this,a)})},dequeue:function(a){return this.each(function(){r.dequeue(this,a)})},clearQueue:function(a){return this.queue(a||"fx",[])},promise:function(a,b){var c,d=1,e=r.Deferred(),f=this,g=this.length,h=function(){--d||e.resolveWith(f,[f])};"string"!=typeof a&&(b=a,a=void 0),a=a||"fx";while(g--)c=V.get(f[g],a+"queueHooks"),c&&c.empty&&(d++,c.empty.add(h));return h(),e.promise(b)}});var _=/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,aa=new RegExp("^(?:([+-])=|)("+_+")([a-z%]*)$","i"),ba=["Top","Right","Bottom","Left"],ca=function(a,b){return a=b||a,"none"===a.style.display||""===a.style.display&&r.contains(a.ownerDocument,a)&&"none"===r.css(a,"display")},da=function(a,b,c,d){var e,f,g={};for(f in b)g[f]=a.style[f],a.style[f]=b[f];e=c.apply(a,d||[]);for(f in b)a.style[f]=g[f];return e};function ea(a,b,c,d){var e,f=1,g=20,h=d?function(){return d.cur()}:function(){return r.css(a,b,"")},i=h(),j=c&&c[3]||(r.cssNumber[b]?"":"px"),k=(r.cssNumber[b]||"px"!==j&&+i)&&aa.exec(r.css(a,b));if(k&&k[3]!==j){j=j||k[3],c=c||[],k=+i||1;do f=f||".5",k/=f,r.style(a,b,k+j);while(f!==(f=h()/i)&&1!==f&&--g)}return c&&(k=+k||+i||0,e=c[1]?k+(c[1]+1)*c[2]:+c[2],d&&(d.unit=j,d.start=k,d.end=e)),e}var fa={};function ga(a){var b,c=a.ownerDocument,d=a.nodeName,e=fa[d];return e?e:(b=c.body.appendChild(c.createElement(d)),e=r.css(b,"display"),b.parentNode.removeChild(b),"none"===e&&(e="block"),fa[d]=e,e)}function ha(a,b){for(var c,d,e=[],f=0,g=a.length;f<g;f++)d=a[f],d.style&&(c=d.style.display,b?("none"===c&&(e[f]=V.get(d,"display")||null,e[f]||(d.style.display="")),""===d.style.display&&ca(d)&&(e[f]=ga(d))):"none"!==c&&(e[f]="none",V.set(d,"display",c)));for(f=0;f<g;f++)null!=e[f]&&(a[f].style.display=e[f]);return a}r.fn.extend({show:function(){return ha(this,!0)},hide:function(){return ha(this)},toggle:function(a){return"boolean"==typeof a?a?this.show():this.hide():this.each(function(){ca(this)?r(this).show():r(this).hide()})}});var ia=/^(?:checkbox|radio)$/i,ja=/<([a-z][^\/\0>\x20\t\r\n\f]+)/i,ka=/^$|\/(?:java|ecma)script/i,la={option:[1,"<select multiple='multiple'>","</select>"],thead:[1,"<table>","</table>"],col:[2,"<table><colgroup>","</colgroup></table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],_default:[0,"",""]};la.optgroup=la.option,la.tbody=la.tfoot=la.colgroup=la.caption=la.thead,la.th=la.td;function ma(a,b){var c;return c="undefined"!=typeof a.getElementsByTagName?a.getElementsByTagName(b||"*"):"undefined"!=typeof a.querySelectorAll?a.querySelectorAll(b||"*"):[],void 0===b||b&&r.nodeName(a,b)?r.merge([a],c):c}function na(a,b){for(var c=0,d=a.length;c<d;c++)V.set(a[c],"globalEval",!b||V.get(b[c],"globalEval"))}var oa=/<|&#?\w+;/;function pa(a,b,c,d,e){for(var f,g,h,i,j,k,l=b.createDocumentFragment(),m=[],n=0,o=a.length;n<o;n++)if(f=a[n],f||0===f)if("object"===r.type(f))r.merge(m,f.nodeType?[f]:f);else if(oa.test(f)){g=g||l.appendChild(b.createElement("div")),h=(ja.exec(f)||["",""])[1].toLowerCase(),i=la[h]||la._default,g.innerHTML=i[1]+r.htmlPrefilter(f)+i[2],k=i[0];while(k--)g=g.lastChild;r.merge(m,g.childNodes),g=l.firstChild,g.textContent=""}else m.push(b.createTextNode(f));l.textContent="",n=0;while(f=m[n++])if(d&&r.inArray(f,d)>-1)e&&e.push(f);else if(j=r.contains(f.ownerDocument,f),g=ma(l.appendChild(f),"script"),j&&na(g),c){k=0;while(f=g[k++])ka.test(f.type||"")&&c.push(f)}return l}!function(){var a=d.createDocumentFragment(),b=a.appendChild(d.createElement("div")),c=d.createElement("input");c.setAttribute("type","radio"),c.setAttribute("checked","checked"),c.setAttribute("name","t"),b.appendChild(c),o.checkClone=b.cloneNode(!0).cloneNode(!0).lastChild.checked,b.innerHTML="<textarea>x</textarea>",o.noCloneChecked=!!b.cloneNode(!0).lastChild.defaultValue}();var qa=d.documentElement,ra=/^key/,sa=/^(?:mouse|pointer|contextmenu|drag|drop)|click/,ta=/^([^.]*)(?:\.(.+)|)/;function ua(){return!0}function va(){return!1}function wa(){try{return d.activeElement}catch(a){}}function xa(a,b,c,d,e,f){var g,h;if("object"==typeof b){"string"!=typeof c&&(d=d||c,c=void 0);for(h in b)xa(a,h,c,d,b[h],f);return a}if(null==d&&null==e?(e=c,d=c=void 0):null==e&&("string"==typeof c?(e=d,d=void 0):(e=d,d=c,c=void 0)),e===!1)e=va;else if(!e)return a;return 1===f&&(g=e,e=function(a){return r().off(a),g.apply(this,arguments)},e.guid=g.guid||(g.guid=r.guid++)),a.each(function(){r.event.add(this,b,e,d,c)})}r.event={global:{},add:function(a,b,c,d,e){var f,g,h,i,j,k,l,m,n,o,p,q=V.get(a);if(q){c.handler&&(f=c,c=f.handler,e=f.selector),e&&r.find.matchesSelector(qa,e),c.guid||(c.guid=r.guid++),(i=q.events)||(i=q.events={}),(g=q.handle)||(g=q.handle=function(b){return"undefined"!=typeof r&&r.event.triggered!==b.type?r.event.dispatch.apply(a,arguments):void 0}),b=(b||"").match(K)||[""],j=b.length;while(j--)h=ta.exec(b[j])||[],n=p=h[1],o=(h[2]||"").split(".").sort(),n&&(l=r.event.special[n]||{},n=(e?l.delegateType:l.bindType)||n,l=r.event.special[n]||{},k=r.extend({type:n,origType:p,data:d,handler:c,guid:c.guid,selector:e,needsContext:e&&r.expr.match.needsContext.test(e),namespace:o.join(".")},f),(m=i[n])||(m=i[n]=[],m.delegateCount=0,l.setup&&l.setup.call(a,d,o,g)!==!1||a.addEventListener&&a.addEventListener(n,g)),l.add&&(l.add.call(a,k),k.handler.guid||(k.handler.guid=c.guid)),e?m.splice(m.delegateCount++,0,k):m.push(k),r.event.global[n]=!0)}},remove:function(a,b,c,d,e){var f,g,h,i,j,k,l,m,n,o,p,q=V.hasData(a)&&V.get(a);if(q&&(i=q.events)){b=(b||"").match(K)||[""],j=b.length;while(j--)if(h=ta.exec(b[j])||[],n=p=h[1],o=(h[2]||"").split(".").sort(),n){l=r.event.special[n]||{},n=(d?l.delegateType:l.bindType)||n,m=i[n]||[],h=h[2]&&new RegExp("(^|\\.)"+o.join("\\.(?:.*\\.|)")+"(\\.|$)"),g=f=m.length;while(f--)k=m[f],!e&&p!==k.origType||c&&c.guid!==k.guid||h&&!h.test(k.namespace)||d&&d!==k.selector&&("**"!==d||!k.selector)||(m.splice(f,1),k.selector&&m.delegateCount--,l.remove&&l.remove.call(a,k));g&&!m.length&&(l.teardown&&l.teardown.call(a,o,q.handle)!==!1||r.removeEvent(a,n,q.handle),delete i[n])}else for(n in i)r.event.remove(a,n+b[j],c,d,!0);r.isEmptyObject(i)&&V.remove(a,"handle events")}},dispatch:function(a){var b=r.event.fix(a),c,d,e,f,g,h,i=new Array(arguments.length),j=(V.get(this,"events")||{})[b.type]||[],k=r.event.special[b.type]||{};for(i[0]=b,c=1;c<arguments.length;c++)i[c]=arguments[c];if(b.delegateTarget=this,!k.preDispatch||k.preDispatch.call(this,b)!==!1){h=r.event.handlers.call(this,b,j),c=0;while((f=h[c++])&&!b.isPropagationStopped()){b.currentTarget=f.elem,d=0;while((g=f.handlers[d++])&&!b.isImmediatePropagationStopped())b.rnamespace&&!b.rnamespace.test(g.namespace)||(b.handleObj=g,b.data=g.data,e=((r.event.special[g.origType]||{}).handle||g.handler).apply(f.elem,i),void 0!==e&&(b.result=e)===!1&&(b.preventDefault(),b.stopPropagation()))}return k.postDispatch&&k.postDispatch.call(this,b),b.result}},handlers:function(a,b){var c,d,e,f,g,h=[],i=b.delegateCount,j=a.target;if(i&&j.nodeType&&!("click"===a.type&&a.button>=1))for(;j!==this;j=j.parentNode||this)if(1===j.nodeType&&("click"!==a.type||j.disabled!==!0)){for(f=[],g={},c=0;c<i;c++)d=b[c],e=d.selector+" ",void 0===g[e]&&(g[e]=d.needsContext?r(e,this).index(j)>-1:r.find(e,this,null,[j]).length),g[e]&&f.push(d);f.length&&h.push({elem:j,handlers:f})}return j=this,i<b.length&&h.push({elem:j,handlers:b.slice(i)}),h},addProp:function(a,b){Object.defineProperty(r.Event.prototype,a,{enumerable:!0,configurable:!0,get:r.isFunction(b)?function(){if(this.originalEvent)return b(this.originalEvent)}:function(){if(this.originalEvent)return this.originalEvent[a]},set:function(b){Object.defineProperty(this,a,{enumerable:!0,configurable:!0,writable:!0,value:b})}})},fix:function(a){return a[r.expando]?a:new r.Event(a)},special:{load:{noBubble:!0},focus:{trigger:function(){if(this!==wa()&&this.focus)return this.focus(),!1},delegateType:"focusin"},blur:{trigger:function(){if(this===wa()&&this.blur)return this.blur(),!1},delegateType:"focusout"},click:{trigger:function(){if("checkbox"===this.type&&this.click&&r.nodeName(this,"input"))return this.click(),!1},_default:function(a){return r.nodeName(a.target,"a")}},beforeunload:{postDispatch:function(a){void 0!==a.result&&a.originalEvent&&(a.originalEvent.returnValue=a.result)}}}},r.removeEvent=function(a,b,c){a.removeEventListener&&a.removeEventListener(b,c)},r.Event=function(a,b){return this instanceof r.Event?(a&&a.type?(this.originalEvent=a,this.type=a.type,this.isDefaultPrevented=a.defaultPrevented||void 0===a.defaultPrevented&&a.returnValue===!1?ua:va,this.target=a.target&&3===a.target.nodeType?a.target.parentNode:a.target,this.currentTarget=a.currentTarget,this.relatedTarget=a.relatedTarget):this.type=a,b&&r.extend(this,b),this.timeStamp=a&&a.timeStamp||r.now(),void(this[r.expando]=!0)):new r.Event(a,b)},r.Event.prototype={constructor:r.Event,isDefaultPrevented:va,isPropagationStopped:va,isImmediatePropagationStopped:va,isSimulated:!1,preventDefault:function(){var a=this.originalEvent;this.isDefaultPrevented=ua,a&&!this.isSimulated&&a.preventDefault()},stopPropagation:function(){var a=this.originalEvent;this.isPropagationStopped=ua,a&&!this.isSimulated&&a.stopPropagation()},stopImmediatePropagation:function(){var a=this.originalEvent;this.isImmediatePropagationStopped=ua,a&&!this.isSimulated&&a.stopImmediatePropagation(),this.stopPropagation()}},r.each({altKey:!0,bubbles:!0,cancelable:!0,changedTouches:!0,ctrlKey:!0,detail:!0,eventPhase:!0,metaKey:!0,pageX:!0,pageY:!0,shiftKey:!0,view:!0,"char":!0,charCode:!0,key:!0,keyCode:!0,button:!0,buttons:!0,clientX:!0,clientY:!0,offsetX:!0,offsetY:!0,pointerId:!0,pointerType:!0,screenX:!0,screenY:!0,targetTouches:!0,toElement:!0,touches:!0,which:function(a){var b=a.button;return null==a.which&&ra.test(a.type)?null!=a.charCode?a.charCode:a.keyCode:!a.which&&void 0!==b&&sa.test(a.type)?1&b?1:2&b?3:4&b?2:0:a.which}},r.event.addProp),r.each({mouseenter:"mouseover",mouseleave:"mouseout",pointerenter:"pointerover",pointerleave:"pointerout"},function(a,b){r.event.special[a]={delegateType:b,bindType:b,handle:function(a){var c,d=this,e=a.relatedTarget,f=a.handleObj;return e&&(e===d||r.contains(d,e))||(a.type=f.origType,c=f.handler.apply(this,arguments),a.type=b),c}}}),r.fn.extend({on:function(a,b,c,d){return xa(this,a,b,c,d)},one:function(a,b,c,d){return xa(this,a,b,c,d,1)},off:function(a,b,c){var d,e;if(a&&a.preventDefault&&a.handleObj)return d=a.handleObj,r(a.delegateTarget).off(d.namespace?d.origType+"."+d.namespace:d.origType,d.selector,d.handler),this;if("object"==typeof a){for(e in a)this.off(e,b,a[e]);return this}return b!==!1&&"function"!=typeof b||(c=b,b=void 0),c===!1&&(c=va),this.each(function(){r.event.remove(this,a,c,b)})}});var ya=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^\/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi,za=/<script|<style|<link/i,Aa=/checked\s*(?:[^=]|=\s*.checked.)/i,Ba=/^true\/(.*)/,Ca=/^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;function Da(a,b){return r.nodeName(a,"table")&&r.nodeName(11!==b.nodeType?b:b.firstChild,"tr")?a.getElementsByTagName("tbody")[0]||a:a}function Ea(a){return a.type=(null!==a.getAttribute("type"))+"/"+a.type,a}function Fa(a){var b=Ba.exec(a.type);return b?a.type=b[1]:a.removeAttribute("type"),a}function Ga(a,b){var c,d,e,f,g,h,i,j;if(1===b.nodeType){if(V.hasData(a)&&(f=V.access(a),g=V.set(b,f),j=f.events)){delete g.handle,g.events={};for(e in j)for(c=0,d=j[e].length;c<d;c++)r.event.add(b,e,j[e][c])}W.hasData(a)&&(h=W.access(a),i=r.extend({},h),W.set(b,i))}}function Ha(a,b){var c=b.nodeName.toLowerCase();"input"===c&&ia.test(a.type)?b.checked=a.checked:"input"!==c&&"textarea"!==c||(b.defaultValue=a.defaultValue)}function Ia(a,b,c,d){b=g.apply([],b);var e,f,h,i,j,k,l=0,m=a.length,n=m-1,q=b[0],s=r.isFunction(q);if(s||m>1&&"string"==typeof q&&!o.checkClone&&Aa.test(q))return a.each(function(e){var f=a.eq(e);s&&(b[0]=q.call(this,e,f.html())),Ia(f,b,c,d)});if(m&&(e=pa(b,a[0].ownerDocument,!1,a,d),f=e.firstChild,1===e.childNodes.length&&(e=f),f||d)){for(h=r.map(ma(e,"script"),Ea),i=h.length;l<m;l++)j=e,l!==n&&(j=r.clone(j,!0,!0),i&&r.merge(h,ma(j,"script"))),c.call(a[l],j,l);if(i)for(k=h[h.length-1].ownerDocument,r.map(h,Fa),l=0;l<i;l++)j=h[l],ka.test(j.type||"")&&!V.access(j,"globalEval")&&r.contains(k,j)&&(j.src?r._evalUrl&&r._evalUrl(j.src):p(j.textContent.replace(Ca,""),k))}return a}function Ja(a,b,c){for(var d,e=b?r.filter(b,a):a,f=0;null!=(d=e[f]);f++)c||1!==d.nodeType||r.cleanData(ma(d)),d.parentNode&&(c&&r.contains(d.ownerDocument,d)&&na(ma(d,"script")),d.parentNode.removeChild(d));return a}r.extend({htmlPrefilter:function(a){return a.replace(ya,"<$1></$2>")},clone:function(a,b,c){var d,e,f,g,h=a.cloneNode(!0),i=r.contains(a.ownerDocument,a);if(!(o.noCloneChecked||1!==a.nodeType&&11!==a.nodeType||r.isXMLDoc(a)))for(g=ma(h),f=ma(a),d=0,e=f.length;d<e;d++)Ha(f[d],g[d]);if(b)if(c)for(f=f||ma(a),g=g||ma(h),d=0,e=f.length;d<e;d++)Ga(f[d],g[d]);else Ga(a,h);return g=ma(h,"script"),g.length>0&&na(g,!i&&ma(a,"script")),h},cleanData:function(a){for(var b,c,d,e=r.event.special,f=0;void 0!==(c=a[f]);f++)if(T(c)){if(b=c[V.expando]){if(b.events)for(d in b.events)e[d]?r.event.remove(c,d):r.removeEvent(c,d,b.handle);c[V.expando]=void 0}c[W.expando]&&(c[W.expando]=void 0)}}}),r.fn.extend({detach:function(a){return Ja(this,a,!0)},remove:function(a){return Ja(this,a)},text:function(a){return S(this,function(a){return void 0===a?r.text(this):this.empty().each(function(){1!==this.nodeType&&11!==this.nodeType&&9!==this.nodeType||(this.textContent=a)})},null,a,arguments.length)},append:function(){return Ia(this,arguments,function(a){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var b=Da(this,a);b.appendChild(a)}})},prepend:function(){return Ia(this,arguments,function(a){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var b=Da(this,a);b.insertBefore(a,b.firstChild)}})},before:function(){return Ia(this,arguments,function(a){this.parentNode&&this.parentNode.insertBefore(a,this)})},after:function(){return Ia(this,arguments,function(a){this.parentNode&&this.parentNode.insertBefore(a,this.nextSibling)})},empty:function(){for(var a,b=0;null!=(a=this[b]);b++)1===a.nodeType&&(r.cleanData(ma(a,!1)),a.textContent="");return this},clone:function(a,b){return a=null!=a&&a,b=null==b?a:b,this.map(function(){return r.clone(this,a,b)})},html:function(a){return S(this,function(a){var b=this[0]||{},c=0,d=this.length;if(void 0===a&&1===b.nodeType)return b.innerHTML;if("string"==typeof a&&!za.test(a)&&!la[(ja.exec(a)||["",""])[1].toLowerCase()]){a=r.htmlPrefilter(a);try{for(;c<d;c++)b=this[c]||{},1===b.nodeType&&(r.cleanData(ma(b,!1)),b.innerHTML=a);b=0}catch(e){}}b&&this.empty().append(a)},null,a,arguments.length)},replaceWith:function(){var a=[];return Ia(this,arguments,function(b){var c=this.parentNode;r.inArray(this,a)<0&&(r.cleanData(ma(this)),c&&c.replaceChild(b,this))},a)}}),r.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(a,b){r.fn[a]=function(a){for(var c,d=[],e=r(a),f=e.length-1,g=0;g<=f;g++)c=g===f?this:this.clone(!0),r(e[g])[b](c),h.apply(d,c.get());return this.pushStack(d)}});var Ka=/^margin/,La=new RegExp("^("+_+")(?!px)[a-z%]+$","i"),Ma=function(b){var c=b.ownerDocument.defaultView;return c&&c.opener||(c=a),c.getComputedStyle(b)};!function(){function b(){if(i){i.style.cssText="box-sizing:border-box;position:relative;display:block;margin:auto;border:1px;padding:1px;top:1%;width:50%",i.innerHTML="",qa.appendChild(h);var b=a.getComputedStyle(i);c="1%"!==b.top,g="2px"===b.marginLeft,e="4px"===b.width,i.style.marginRight="50%",f="4px"===b.marginRight,qa.removeChild(h),i=null}}var c,e,f,g,h=d.createElement("div"),i=d.createElement("div");i.style&&(i.style.backgroundClip="content-box",i.cloneNode(!0).style.backgroundClip="",o.clearCloneStyle="content-box"===i.style.backgroundClip,h.style.cssText="border:0;width:8px;height:0;top:0;left:-9999px;padding:0;margin-top:1px;position:absolute",h.appendChild(i),r.extend(o,{pixelPosition:function(){return b(),c},boxSizingReliable:function(){return b(),e},pixelMarginRight:function(){return b(),f},reliableMarginLeft:function(){return b(),g}}))}();function Na(a,b,c){var d,e,f,g,h=a.style;return c=c||Ma(a),c&&(g=c.getPropertyValue(b)||c[b],""!==g||r.contains(a.ownerDocument,a)||(g=r.style(a,b)),!o.pixelMarginRight()&&La.test(g)&&Ka.test(b)&&(d=h.width,e=h.minWidth,f=h.maxWidth,h.minWidth=h.maxWidth=h.width=g,g=c.width,h.width=d,h.minWidth=e,h.maxWidth=f)),void 0!==g?g+"":g}function Oa(a,b){return{get:function(){return a()?void delete this.get:(this.get=b).apply(this,arguments)}}}var Pa=/^(none|table(?!-c[ea]).+)/,Qa={position:"absolute",visibility:"hidden",display:"block"},Ra={letterSpacing:"0",fontWeight:"400"},Sa=["Webkit","Moz","ms"],Ta=d.createElement("div").style;function Ua(a){if(a in Ta)return a;var b=a[0].toUpperCase()+a.slice(1),c=Sa.length;while(c--)if(a=Sa[c]+b,a in Ta)return a}function Va(a,b,c){var d=aa.exec(b);return d?Math.max(0,d[2]-(c||0))+(d[3]||"px"):b}function Wa(a,b,c,d,e){var f,g=0;for(f=c===(d?"border":"content")?4:"width"===b?1:0;f<4;f+=2)"margin"===c&&(g+=r.css(a,c+ba[f],!0,e)),d?("content"===c&&(g-=r.css(a,"padding"+ba[f],!0,e)),"margin"!==c&&(g-=r.css(a,"border"+ba[f]+"Width",!0,e))):(g+=r.css(a,"padding"+ba[f],!0,e),"padding"!==c&&(g+=r.css(a,"border"+ba[f]+"Width",!0,e)));return g}function Xa(a,b,c){var d,e=!0,f=Ma(a),g="border-box"===r.css(a,"boxSizing",!1,f);if(a.getClientRects().length&&(d=a.getBoundingClientRect()[b]),d<=0||null==d){if(d=Na(a,b,f),(d<0||null==d)&&(d=a.style[b]),La.test(d))return d;e=g&&(o.boxSizingReliable()||d===a.style[b]),d=parseFloat(d)||0}return d+Wa(a,b,c||(g?"border":"content"),e,f)+"px"}r.extend({cssHooks:{opacity:{get:function(a,b){if(b){var c=Na(a,"opacity");return""===c?"1":c}}}},cssNumber:{animationIterationCount:!0,columnCount:!0,fillOpacity:!0,flexGrow:!0,flexShrink:!0,fontWeight:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{"float":"cssFloat"},style:function(a,b,c,d){if(a&&3!==a.nodeType&&8!==a.nodeType&&a.style){var e,f,g,h=r.camelCase(b),i=a.style;return b=r.cssProps[h]||(r.cssProps[h]=Ua(h)||h),g=r.cssHooks[b]||r.cssHooks[h],void 0===c?g&&"get"in g&&void 0!==(e=g.get(a,!1,d))?e:i[b]:(f=typeof c,"string"===f&&(e=aa.exec(c))&&e[1]&&(c=ea(a,b,e),f="number"),null!=c&&c===c&&("number"===f&&(c+=e&&e[3]||(r.cssNumber[h]?"":"px")),o.clearCloneStyle||""!==c||0!==b.indexOf("background")||(i[b]="inherit"),g&&"set"in g&&void 0===(c=g.set(a,c,d))||(i[b]=c)),void 0)}},css:function(a,b,c,d){var e,f,g,h=r.camelCase(b);return b=r.cssProps[h]||(r.cssProps[h]=Ua(h)||h),g=r.cssHooks[b]||r.cssHooks[h],g&&"get"in g&&(e=g.get(a,!0,c)),void 0===e&&(e=Na(a,b,d)),"normal"===e&&b in Ra&&(e=Ra[b]),""===c||c?(f=parseFloat(e),c===!0||isFinite(f)?f||0:e):e}}),r.each(["height","width"],function(a,b){r.cssHooks[b]={get:function(a,c,d){if(c)return!Pa.test(r.css(a,"display"))||a.getClientRects().length&&a.getBoundingClientRect().width?Xa(a,b,d):da(a,Qa,function(){return Xa(a,b,d)})},set:function(a,c,d){var e,f=d&&Ma(a),g=d&&Wa(a,b,d,"border-box"===r.css(a,"boxSizing",!1,f),f);return g&&(e=aa.exec(c))&&"px"!==(e[3]||"px")&&(a.style[b]=c,c=r.css(a,b)),Va(a,c,g)}}}),r.cssHooks.marginLeft=Oa(o.reliableMarginLeft,function(a,b){if(b)return(parseFloat(Na(a,"marginLeft"))||a.getBoundingClientRect().left-da(a,{marginLeft:0},function(){return a.getBoundingClientRect().left}))+"px"}),r.each({margin:"",padding:"",border:"Width"},function(a,b){r.cssHooks[a+b]={expand:function(c){for(var d=0,e={},f="string"==typeof c?c.split(" "):[c];d<4;d++)e[a+ba[d]+b]=f[d]||f[d-2]||f[0];return e}},Ka.test(a)||(r.cssHooks[a+b].set=Va)}),r.fn.extend({css:function(a,b){return S(this,function(a,b,c){var d,e,f={},g=0;if(r.isArray(b)){for(d=Ma(a),e=b.length;g<e;g++)f[b[g]]=r.css(a,b[g],!1,d);return f}return void 0!==c?r.style(a,b,c):r.css(a,b)},a,b,arguments.length>1)}});function Ya(a,b,c,d,e){return new Ya.prototype.init(a,b,c,d,e)}r.Tween=Ya,Ya.prototype={constructor:Ya,init:function(a,b,c,d,e,f){this.elem=a,this.prop=c,this.easing=e||r.easing._default,this.options=b,this.start=this.now=this.cur(),this.end=d,this.unit=f||(r.cssNumber[c]?"":"px")},cur:function(){var a=Ya.propHooks[this.prop];return a&&a.get?a.get(this):Ya.propHooks._default.get(this)},run:function(a){var b,c=Ya.propHooks[this.prop];return this.options.duration?this.pos=b=r.easing[this.easing](a,this.options.duration*a,0,1,this.options.duration):this.pos=b=a,this.now=(this.end-this.start)*b+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),c&&c.set?c.set(this):Ya.propHooks._default.set(this),this}},Ya.prototype.init.prototype=Ya.prototype,Ya.propHooks={_default:{get:function(a){var b;return 1!==a.elem.nodeType||null!=a.elem[a.prop]&&null==a.elem.style[a.prop]?a.elem[a.prop]:(b=r.css(a.elem,a.prop,""),b&&"auto"!==b?b:0)},set:function(a){r.fx.step[a.prop]?r.fx.step[a.prop](a):1!==a.elem.nodeType||null==a.elem.style[r.cssProps[a.prop]]&&!r.cssHooks[a.prop]?a.elem[a.prop]=a.now:r.style(a.elem,a.prop,a.now+a.unit)}}},Ya.propHooks.scrollTop=Ya.propHooks.scrollLeft={set:function(a){a.elem.nodeType&&a.elem.parentNode&&(a.elem[a.prop]=a.now)}},r.easing={linear:function(a){return a},swing:function(a){return.5-Math.cos(a*Math.PI)/2},_default:"swing"},r.fx=Ya.prototype.init,r.fx.step={};var Za,$a,_a=/^(?:toggle|show|hide)$/,ab=/queueHooks$/;function bb(){$a&&(a.requestAnimationFrame(bb),r.fx.tick())}function cb(){return a.setTimeout(function(){Za=void 0}),Za=r.now()}function db(a,b){var c,d=0,e={height:a};for(b=b?1:0;d<4;d+=2-b)c=ba[d],e["margin"+c]=e["padding"+c]=a;return b&&(e.opacity=e.width=a),e}function eb(a,b,c){for(var d,e=(hb.tweeners[b]||[]).concat(hb.tweeners["*"]),f=0,g=e.length;f<g;f++)if(d=e[f].call(c,b,a))return d}function fb(a,b,c){var d,e,f,g,h,i,j,k,l="width"in b||"height"in b,m=this,n={},o=a.style,p=a.nodeType&&ca(a),q=V.get(a,"fxshow");c.queue||(g=r._queueHooks(a,"fx"),null==g.unqueued&&(g.unqueued=0,h=g.empty.fire,g.empty.fire=function(){g.unqueued||h()}),g.unqueued++,m.always(function(){m.always(function(){g.unqueued--,r.queue(a,"fx").length||g.empty.fire()})}));for(d in b)if(e=b[d],_a.test(e)){if(delete b[d],f=f||"toggle"===e,e===(p?"hide":"show")){if("show"!==e||!q||void 0===q[d])continue;p=!0}n[d]=q&&q[d]||r.style(a,d)}if(i=!r.isEmptyObject(b),i||!r.isEmptyObject(n)){l&&1===a.nodeType&&(c.overflow=[o.overflow,o.overflowX,o.overflowY],j=q&&q.display,null==j&&(j=V.get(a,"display")),k=r.css(a,"display"),"none"===k&&(j?k=j:(ha([a],!0),j=a.style.display||j,k=r.css(a,"display"),ha([a]))),("inline"===k||"inline-block"===k&&null!=j)&&"none"===r.css(a,"float")&&(i||(m.done(function(){o.display=j}),null==j&&(k=o.display,j="none"===k?"":k)),o.display="inline-block")),c.overflow&&(o.overflow="hidden",m.always(function(){o.overflow=c.overflow[0],o.overflowX=c.overflow[1],o.overflowY=c.overflow[2]})),i=!1;for(d in n)i||(q?"hidden"in q&&(p=q.hidden):q=V.access(a,"fxshow",{display:j}),f&&(q.hidden=!p),p&&ha([a],!0),m.done(function(){p||ha([a]),V.remove(a,"fxshow");for(d in n)r.style(a,d,n[d])})),i=eb(p?q[d]:0,d,m),d in q||(q[d]=i.start,p&&(i.end=i.start,i.start=0))}}function gb(a,b){var c,d,e,f,g;for(c in a)if(d=r.camelCase(c),e=b[d],f=a[c],r.isArray(f)&&(e=f[1],f=a[c]=f[0]),c!==d&&(a[d]=f,delete a[c]),g=r.cssHooks[d],g&&"expand"in g){f=g.expand(f),delete a[d];for(c in f)c in a||(a[c]=f[c],b[c]=e)}else b[d]=e}function hb(a,b,c){var d,e,f=0,g=hb.prefilters.length,h=r.Deferred().always(function(){delete i.elem}),i=function(){if(e)return!1;for(var b=Za||cb(),c=Math.max(0,j.startTime+j.duration-b),d=c/j.duration||0,f=1-d,g=0,i=j.tweens.length;g<i;g++)j.tweens[g].run(f);return h.notifyWith(a,[j,f,c]),f<1&&i?c:(h.resolveWith(a,[j]),!1)},j=h.promise({elem:a,props:r.extend({},b),opts:r.extend(!0,{specialEasing:{},easing:r.easing._default},c),originalProperties:b,originalOptions:c,startTime:Za||cb(),duration:c.duration,tweens:[],createTween:function(b,c){var d=r.Tween(a,j.opts,b,c,j.opts.specialEasing[b]||j.opts.easing);return j.tweens.push(d),d},stop:function(b){var c=0,d=b?j.tweens.length:0;if(e)return this;for(e=!0;c<d;c++)j.tweens[c].run(1);return b?(h.notifyWith(a,[j,1,0]),h.resolveWith(a,[j,b])):h.rejectWith(a,[j,b]),this}}),k=j.props;for(gb(k,j.opts.specialEasing);f<g;f++)if(d=hb.prefilters[f].call(j,a,k,j.opts))return r.isFunction(d.stop)&&(r._queueHooks(j.elem,j.opts.queue).stop=r.proxy(d.stop,d)),d;return r.map(k,eb,j),r.isFunction(j.opts.start)&&j.opts.start.call(a,j),r.fx.timer(r.extend(i,{elem:a,anim:j,queue:j.opts.queue})),j.progress(j.opts.progress).done(j.opts.done,j.opts.complete).fail(j.opts.fail).always(j.opts.always)}r.Animation=r.extend(hb,{tweeners:{"*":[function(a,b){var c=this.createTween(a,b);return ea(c.elem,a,aa.exec(b),c),c}]},tweener:function(a,b){r.isFunction(a)?(b=a,a=["*"]):a=a.match(K);for(var c,d=0,e=a.length;d<e;d++)c=a[d],hb.tweeners[c]=hb.tweeners[c]||[],hb.tweeners[c].unshift(b)},prefilters:[fb],prefilter:function(a,b){b?hb.prefilters.unshift(a):hb.prefilters.push(a)}}),r.speed=function(a,b,c){var e=a&&"object"==typeof a?r.extend({},a):{complete:c||!c&&b||r.isFunction(a)&&a,duration:a,easing:c&&b||b&&!r.isFunction(b)&&b};return r.fx.off||d.hidden?e.duration=0:"number"!=typeof e.duration&&(e.duration in r.fx.speeds?e.duration=r.fx.speeds[e.duration]:e.duration=r.fx.speeds._default),null!=e.queue&&e.queue!==!0||(e.queue="fx"),e.old=e.complete,e.complete=function(){r.isFunction(e.old)&&e.old.call(this),e.queue&&r.dequeue(this,e.queue)},e},r.fn.extend({fadeTo:function(a,b,c,d){return this.filter(ca).css("opacity",0).show().end().animate({opacity:b},a,c,d)},animate:function(a,b,c,d){var e=r.isEmptyObject(a),f=r.speed(b,c,d),g=function(){var b=hb(this,r.extend({},a),f);(e||V.get(this,"finish"))&&b.stop(!0)};return g.finish=g,e||f.queue===!1?this.each(g):this.queue(f.queue,g)},stop:function(a,b,c){var d=function(a){var b=a.stop;delete a.stop,b(c)};return"string"!=typeof a&&(c=b,b=a,a=void 0),b&&a!==!1&&this.queue(a||"fx",[]),this.each(function(){var b=!0,e=null!=a&&a+"queueHooks",f=r.timers,g=V.get(this);if(e)g[e]&&g[e].stop&&d(g[e]);else for(e in g)g[e]&&g[e].stop&&ab.test(e)&&d(g[e]);for(e=f.length;e--;)f[e].elem!==this||null!=a&&f[e].queue!==a||(f[e].anim.stop(c),b=!1,f.splice(e,1));!b&&c||r.dequeue(this,a)})},finish:function(a){return a!==!1&&(a=a||"fx"),this.each(function(){var b,c=V.get(this),d=c[a+"queue"],e=c[a+"queueHooks"],f=r.timers,g=d?d.length:0;for(c.finish=!0,r.queue(this,a,[]),e&&e.stop&&e.stop.call(this,!0),b=f.length;b--;)f[b].elem===this&&f[b].queue===a&&(f[b].anim.stop(!0),f.splice(b,1));for(b=0;b<g;b++)d[b]&&d[b].finish&&d[b].finish.call(this);delete c.finish})}}),r.each(["toggle","show","hide"],function(a,b){var c=r.fn[b];r.fn[b]=function(a,d,e){return null==a||"boolean"==typeof a?c.apply(this,arguments):this.animate(db(b,!0),a,d,e)}}),r.each({slideDown:db("show"),slideUp:db("hide"),slideToggle:db("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(a,b){r.fn[a]=function(a,c,d){return this.animate(b,a,c,d)}}),r.timers=[],r.fx.tick=function(){var a,b=0,c=r.timers;for(Za=r.now();b<c.length;b++)a=c[b],a()||c[b]!==a||c.splice(b--,1);c.length||r.fx.stop(),Za=void 0},r.fx.timer=function(a){r.timers.push(a),a()?r.fx.start():r.timers.pop()},r.fx.interval=13,r.fx.start=function(){$a||($a=a.requestAnimationFrame?a.requestAnimationFrame(bb):a.setInterval(r.fx.tick,r.fx.interval))},r.fx.stop=function(){a.cancelAnimationFrame?a.cancelAnimationFrame($a):a.clearInterval($a),$a=null},r.fx.speeds={slow:600,fast:200,_default:400},r.fn.delay=function(b,c){return b=r.fx?r.fx.speeds[b]||b:b,c=c||"fx",this.queue(c,function(c,d){var e=a.setTimeout(c,b);d.stop=function(){a.clearTimeout(e)}})},function(){var a=d.createElement("input"),b=d.createElement("select"),c=b.appendChild(d.createElement("option"));a.type="checkbox",o.checkOn=""!==a.value,o.optSelected=c.selected,a=d.createElement("input"),a.value="t",a.type="radio",o.radioValue="t"===a.value}();var ib,jb=r.expr.attrHandle;r.fn.extend({attr:function(a,b){return S(this,r.attr,a,b,arguments.length>1)},removeAttr:function(a){return this.each(function(){r.removeAttr(this,a)})}}),r.extend({attr:function(a,b,c){var d,e,f=a.nodeType;if(3!==f&&8!==f&&2!==f)return"undefined"==typeof a.getAttribute?r.prop(a,b,c):(1===f&&r.isXMLDoc(a)||(e=r.attrHooks[b.toLowerCase()]||(r.expr.match.bool.test(b)?ib:void 0)),
void 0!==c?null===c?void r.removeAttr(a,b):e&&"set"in e&&void 0!==(d=e.set(a,c,b))?d:(a.setAttribute(b,c+""),c):e&&"get"in e&&null!==(d=e.get(a,b))?d:(d=r.find.attr(a,b),null==d?void 0:d))},attrHooks:{type:{set:function(a,b){if(!o.radioValue&&"radio"===b&&r.nodeName(a,"input")){var c=a.value;return a.setAttribute("type",b),c&&(a.value=c),b}}}},removeAttr:function(a,b){var c,d=0,e=b&&b.match(K);if(e&&1===a.nodeType)while(c=e[d++])a.removeAttribute(c)}}),ib={set:function(a,b,c){return b===!1?r.removeAttr(a,c):a.setAttribute(c,c),c}},r.each(r.expr.match.bool.source.match(/\w+/g),function(a,b){var c=jb[b]||r.find.attr;jb[b]=function(a,b,d){var e,f,g=b.toLowerCase();return d||(f=jb[g],jb[g]=e,e=null!=c(a,b,d)?g:null,jb[g]=f),e}});var kb=/^(?:input|select|textarea|button)$/i,lb=/^(?:a|area)$/i;r.fn.extend({prop:function(a,b){return S(this,r.prop,a,b,arguments.length>1)},removeProp:function(a){return this.each(function(){delete this[r.propFix[a]||a]})}}),r.extend({prop:function(a,b,c){var d,e,f=a.nodeType;if(3!==f&&8!==f&&2!==f)return 1===f&&r.isXMLDoc(a)||(b=r.propFix[b]||b,e=r.propHooks[b]),void 0!==c?e&&"set"in e&&void 0!==(d=e.set(a,c,b))?d:a[b]=c:e&&"get"in e&&null!==(d=e.get(a,b))?d:a[b]},propHooks:{tabIndex:{get:function(a){var b=r.find.attr(a,"tabindex");return b?parseInt(b,10):kb.test(a.nodeName)||lb.test(a.nodeName)&&a.href?0:-1}}},propFix:{"for":"htmlFor","class":"className"}}),o.optSelected||(r.propHooks.selected={get:function(a){var b=a.parentNode;return b&&b.parentNode&&b.parentNode.selectedIndex,null},set:function(a){var b=a.parentNode;b&&(b.selectedIndex,b.parentNode&&b.parentNode.selectedIndex)}}),r.each(["tabIndex","readOnly","maxLength","cellSpacing","cellPadding","rowSpan","colSpan","useMap","frameBorder","contentEditable"],function(){r.propFix[this.toLowerCase()]=this});function mb(a){var b=a.match(K)||[];return b.join(" ")}function nb(a){return a.getAttribute&&a.getAttribute("class")||""}r.fn.extend({addClass:function(a){var b,c,d,e,f,g,h,i=0;if(r.isFunction(a))return this.each(function(b){r(this).addClass(a.call(this,b,nb(this)))});if("string"==typeof a&&a){b=a.match(K)||[];while(c=this[i++])if(e=nb(c),d=1===c.nodeType&&" "+mb(e)+" "){g=0;while(f=b[g++])d.indexOf(" "+f+" ")<0&&(d+=f+" ");h=mb(d),e!==h&&c.setAttribute("class",h)}}return this},removeClass:function(a){var b,c,d,e,f,g,h,i=0;if(r.isFunction(a))return this.each(function(b){r(this).removeClass(a.call(this,b,nb(this)))});if(!arguments.length)return this.attr("class","");if("string"==typeof a&&a){b=a.match(K)||[];while(c=this[i++])if(e=nb(c),d=1===c.nodeType&&" "+mb(e)+" "){g=0;while(f=b[g++])while(d.indexOf(" "+f+" ")>-1)d=d.replace(" "+f+" "," ");h=mb(d),e!==h&&c.setAttribute("class",h)}}return this},toggleClass:function(a,b){var c=typeof a;return"boolean"==typeof b&&"string"===c?b?this.addClass(a):this.removeClass(a):r.isFunction(a)?this.each(function(c){r(this).toggleClass(a.call(this,c,nb(this),b),b)}):this.each(function(){var b,d,e,f;if("string"===c){d=0,e=r(this),f=a.match(K)||[];while(b=f[d++])e.hasClass(b)?e.removeClass(b):e.addClass(b)}else void 0!==a&&"boolean"!==c||(b=nb(this),b&&V.set(this,"__className__",b),this.setAttribute&&this.setAttribute("class",b||a===!1?"":V.get(this,"__className__")||""))})},hasClass:function(a){var b,c,d=0;b=" "+a+" ";while(c=this[d++])if(1===c.nodeType&&(" "+mb(nb(c))+" ").indexOf(b)>-1)return!0;return!1}});var ob=/\r/g;r.fn.extend({val:function(a){var b,c,d,e=this[0];{if(arguments.length)return d=r.isFunction(a),this.each(function(c){var e;1===this.nodeType&&(e=d?a.call(this,c,r(this).val()):a,null==e?e="":"number"==typeof e?e+="":r.isArray(e)&&(e=r.map(e,function(a){return null==a?"":a+""})),b=r.valHooks[this.type]||r.valHooks[this.nodeName.toLowerCase()],b&&"set"in b&&void 0!==b.set(this,e,"value")||(this.value=e))});if(e)return b=r.valHooks[e.type]||r.valHooks[e.nodeName.toLowerCase()],b&&"get"in b&&void 0!==(c=b.get(e,"value"))?c:(c=e.value,"string"==typeof c?c.replace(ob,""):null==c?"":c)}}}),r.extend({valHooks:{option:{get:function(a){var b=r.find.attr(a,"value");return null!=b?b:mb(r.text(a))}},select:{get:function(a){var b,c,d,e=a.options,f=a.selectedIndex,g="select-one"===a.type,h=g?null:[],i=g?f+1:e.length;for(d=f<0?i:g?f:0;d<i;d++)if(c=e[d],(c.selected||d===f)&&!c.disabled&&(!c.parentNode.disabled||!r.nodeName(c.parentNode,"optgroup"))){if(b=r(c).val(),g)return b;h.push(b)}return h},set:function(a,b){var c,d,e=a.options,f=r.makeArray(b),g=e.length;while(g--)d=e[g],(d.selected=r.inArray(r.valHooks.option.get(d),f)>-1)&&(c=!0);return c||(a.selectedIndex=-1),f}}}}),r.each(["radio","checkbox"],function(){r.valHooks[this]={set:function(a,b){if(r.isArray(b))return a.checked=r.inArray(r(a).val(),b)>-1}},o.checkOn||(r.valHooks[this].get=function(a){return null===a.getAttribute("value")?"on":a.value})});var pb=/^(?:focusinfocus|focusoutblur)$/;r.extend(r.event,{trigger:function(b,c,e,f){var g,h,i,j,k,m,n,o=[e||d],p=l.call(b,"type")?b.type:b,q=l.call(b,"namespace")?b.namespace.split("."):[];if(h=i=e=e||d,3!==e.nodeType&&8!==e.nodeType&&!pb.test(p+r.event.triggered)&&(p.indexOf(".")>-1&&(q=p.split("."),p=q.shift(),q.sort()),k=p.indexOf(":")<0&&"on"+p,b=b[r.expando]?b:new r.Event(p,"object"==typeof b&&b),b.isTrigger=f?2:3,b.namespace=q.join("."),b.rnamespace=b.namespace?new RegExp("(^|\\.)"+q.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,b.result=void 0,b.target||(b.target=e),c=null==c?[b]:r.makeArray(c,[b]),n=r.event.special[p]||{},f||!n.trigger||n.trigger.apply(e,c)!==!1)){if(!f&&!n.noBubble&&!r.isWindow(e)){for(j=n.delegateType||p,pb.test(j+p)||(h=h.parentNode);h;h=h.parentNode)o.push(h),i=h;i===(e.ownerDocument||d)&&o.push(i.defaultView||i.parentWindow||a)}g=0;while((h=o[g++])&&!b.isPropagationStopped())b.type=g>1?j:n.bindType||p,m=(V.get(h,"events")||{})[b.type]&&V.get(h,"handle"),m&&m.apply(h,c),m=k&&h[k],m&&m.apply&&T(h)&&(b.result=m.apply(h,c),b.result===!1&&b.preventDefault());return b.type=p,f||b.isDefaultPrevented()||n._default&&n._default.apply(o.pop(),c)!==!1||!T(e)||k&&r.isFunction(e[p])&&!r.isWindow(e)&&(i=e[k],i&&(e[k]=null),r.event.triggered=p,e[p](),r.event.triggered=void 0,i&&(e[k]=i)),b.result}},simulate:function(a,b,c){var d=r.extend(new r.Event,c,{type:a,isSimulated:!0});r.event.trigger(d,null,b)}}),r.fn.extend({trigger:function(a,b){return this.each(function(){r.event.trigger(a,b,this)})},triggerHandler:function(a,b){var c=this[0];if(c)return r.event.trigger(a,b,c,!0)}}),r.each("blur focus focusin focusout resize scroll click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup contextmenu".split(" "),function(a,b){r.fn[b]=function(a,c){return arguments.length>0?this.on(b,null,a,c):this.trigger(b)}}),r.fn.extend({hover:function(a,b){return this.mouseenter(a).mouseleave(b||a)}}),o.focusin="onfocusin"in a,o.focusin||r.each({focus:"focusin",blur:"focusout"},function(a,b){var c=function(a){r.event.simulate(b,a.target,r.event.fix(a))};r.event.special[b]={setup:function(){var d=this.ownerDocument||this,e=V.access(d,b);e||d.addEventListener(a,c,!0),V.access(d,b,(e||0)+1)},teardown:function(){var d=this.ownerDocument||this,e=V.access(d,b)-1;e?V.access(d,b,e):(d.removeEventListener(a,c,!0),V.remove(d,b))}}});var qb=a.location,rb=r.now(),sb=/\?/;r.parseXML=function(b){var c;if(!b||"string"!=typeof b)return null;try{c=(new a.DOMParser).parseFromString(b,"text/xml")}catch(d){c=void 0}return c&&!c.getElementsByTagName("parsererror").length||r.error("Invalid XML: "+b),c};var tb=/\[\]$/,ub=/\r?\n/g,vb=/^(?:submit|button|image|reset|file)$/i,wb=/^(?:input|select|textarea|keygen)/i;function xb(a,b,c,d){var e;if(r.isArray(b))r.each(b,function(b,e){c||tb.test(a)?d(a,e):xb(a+"["+("object"==typeof e&&null!=e?b:"")+"]",e,c,d)});else if(c||"object"!==r.type(b))d(a,b);else for(e in b)xb(a+"["+e+"]",b[e],c,d)}r.param=function(a,b){var c,d=[],e=function(a,b){var c=r.isFunction(b)?b():b;d[d.length]=encodeURIComponent(a)+"="+encodeURIComponent(null==c?"":c)};if(r.isArray(a)||a.jquery&&!r.isPlainObject(a))r.each(a,function(){e(this.name,this.value)});else for(c in a)xb(c,a[c],b,e);return d.join("&")},r.fn.extend({serialize:function(){return r.param(this.serializeArray())},serializeArray:function(){return this.map(function(){var a=r.prop(this,"elements");return a?r.makeArray(a):this}).filter(function(){var a=this.type;return this.name&&!r(this).is(":disabled")&&wb.test(this.nodeName)&&!vb.test(a)&&(this.checked||!ia.test(a))}).map(function(a,b){var c=r(this).val();return null==c?null:r.isArray(c)?r.map(c,function(a){return{name:b.name,value:a.replace(ub,"\r\n")}}):{name:b.name,value:c.replace(ub,"\r\n")}}).get()}});var yb=/%20/g,zb=/#.*$/,Ab=/([?&])_=[^&]*/,Bb=/^(.*?):[ \t]*([^\r\n]*)$/gm,Cb=/^(?:about|app|app-storage|.+-extension|file|res|widget):$/,Db=/^(?:GET|HEAD)$/,Eb=/^\/\//,Fb={},Gb={},Hb="*/".concat("*"),Ib=d.createElement("a");Ib.href=qb.href;function Jb(a){return function(b,c){"string"!=typeof b&&(c=b,b="*");var d,e=0,f=b.toLowerCase().match(K)||[];if(r.isFunction(c))while(d=f[e++])"+"===d[0]?(d=d.slice(1)||"*",(a[d]=a[d]||[]).unshift(c)):(a[d]=a[d]||[]).push(c)}}function Kb(a,b,c,d){var e={},f=a===Gb;function g(h){var i;return e[h]=!0,r.each(a[h]||[],function(a,h){var j=h(b,c,d);return"string"!=typeof j||f||e[j]?f?!(i=j):void 0:(b.dataTypes.unshift(j),g(j),!1)}),i}return g(b.dataTypes[0])||!e["*"]&&g("*")}function Lb(a,b){var c,d,e=r.ajaxSettings.flatOptions||{};for(c in b)void 0!==b[c]&&((e[c]?a:d||(d={}))[c]=b[c]);return d&&r.extend(!0,a,d),a}function Mb(a,b,c){var d,e,f,g,h=a.contents,i=a.dataTypes;while("*"===i[0])i.shift(),void 0===d&&(d=a.mimeType||b.getResponseHeader("Content-Type"));if(d)for(e in h)if(h[e]&&h[e].test(d)){i.unshift(e);break}if(i[0]in c)f=i[0];else{for(e in c){if(!i[0]||a.converters[e+" "+i[0]]){f=e;break}g||(g=e)}f=f||g}if(f)return f!==i[0]&&i.unshift(f),c[f]}function Nb(a,b,c,d){var e,f,g,h,i,j={},k=a.dataTypes.slice();if(k[1])for(g in a.converters)j[g.toLowerCase()]=a.converters[g];f=k.shift();while(f)if(a.responseFields[f]&&(c[a.responseFields[f]]=b),!i&&d&&a.dataFilter&&(b=a.dataFilter(b,a.dataType)),i=f,f=k.shift())if("*"===f)f=i;else if("*"!==i&&i!==f){if(g=j[i+" "+f]||j["* "+f],!g)for(e in j)if(h=e.split(" "),h[1]===f&&(g=j[i+" "+h[0]]||j["* "+h[0]])){g===!0?g=j[e]:j[e]!==!0&&(f=h[0],k.unshift(h[1]));break}if(g!==!0)if(g&&a["throws"])b=g(b);else try{b=g(b)}catch(l){return{state:"parsererror",error:g?l:"No conversion from "+i+" to "+f}}}return{state:"success",data:b}}r.extend({active:0,lastModified:{},etag:{},ajaxSettings:{url:qb.href,type:"GET",isLocal:Cb.test(qb.protocol),global:!0,processData:!0,async:!0,contentType:"application/x-www-form-urlencoded; charset=UTF-8",accepts:{"*":Hb,text:"text/plain",html:"text/html",xml:"application/xml, text/xml",json:"application/json, text/javascript"},contents:{xml:/\bxml\b/,html:/\bhtml/,json:/\bjson\b/},responseFields:{xml:"responseXML",text:"responseText",json:"responseJSON"},converters:{"* text":String,"text html":!0,"text json":JSON.parse,"text xml":r.parseXML},flatOptions:{url:!0,context:!0}},ajaxSetup:function(a,b){return b?Lb(Lb(a,r.ajaxSettings),b):Lb(r.ajaxSettings,a)},ajaxPrefilter:Jb(Fb),ajaxTransport:Jb(Gb),ajax:function(b,c){"object"==typeof b&&(c=b,b=void 0),c=c||{};var e,f,g,h,i,j,k,l,m,n,o=r.ajaxSetup({},c),p=o.context||o,q=o.context&&(p.nodeType||p.jquery)?r(p):r.event,s=r.Deferred(),t=r.Callbacks("once memory"),u=o.statusCode||{},v={},w={},x="canceled",y={readyState:0,getResponseHeader:function(a){var b;if(k){if(!h){h={};while(b=Bb.exec(g))h[b[1].toLowerCase()]=b[2]}b=h[a.toLowerCase()]}return null==b?null:b},getAllResponseHeaders:function(){return k?g:null},setRequestHeader:function(a,b){return null==k&&(a=w[a.toLowerCase()]=w[a.toLowerCase()]||a,v[a]=b),this},overrideMimeType:function(a){return null==k&&(o.mimeType=a),this},statusCode:function(a){var b;if(a)if(k)y.always(a[y.status]);else for(b in a)u[b]=[u[b],a[b]];return this},abort:function(a){var b=a||x;return e&&e.abort(b),A(0,b),this}};if(s.promise(y),o.url=((b||o.url||qb.href)+"").replace(Eb,qb.protocol+"//"),o.type=c.method||c.type||o.method||o.type,o.dataTypes=(o.dataType||"*").toLowerCase().match(K)||[""],null==o.crossDomain){j=d.createElement("a");try{j.href=o.url,j.href=j.href,o.crossDomain=Ib.protocol+"//"+Ib.host!=j.protocol+"//"+j.host}catch(z){o.crossDomain=!0}}if(o.data&&o.processData&&"string"!=typeof o.data&&(o.data=r.param(o.data,o.traditional)),Kb(Fb,o,c,y),k)return y;l=r.event&&o.global,l&&0===r.active++&&r.event.trigger("ajaxStart"),o.type=o.type.toUpperCase(),o.hasContent=!Db.test(o.type),f=o.url.replace(zb,""),o.hasContent?o.data&&o.processData&&0===(o.contentType||"").indexOf("application/x-www-form-urlencoded")&&(o.data=o.data.replace(yb,"+")):(n=o.url.slice(f.length),o.data&&(f+=(sb.test(f)?"&":"?")+o.data,delete o.data),o.cache===!1&&(f=f.replace(Ab,"$1"),n=(sb.test(f)?"&":"?")+"_="+rb++ +n),o.url=f+n),o.ifModified&&(r.lastModified[f]&&y.setRequestHeader("If-Modified-Since",r.lastModified[f]),r.etag[f]&&y.setRequestHeader("If-None-Match",r.etag[f])),(o.data&&o.hasContent&&o.contentType!==!1||c.contentType)&&y.setRequestHeader("Content-Type",o.contentType),y.setRequestHeader("Accept",o.dataTypes[0]&&o.accepts[o.dataTypes[0]]?o.accepts[o.dataTypes[0]]+("*"!==o.dataTypes[0]?", "+Hb+"; q=0.01":""):o.accepts["*"]);for(m in o.headers)y.setRequestHeader(m,o.headers[m]);if(o.beforeSend&&(o.beforeSend.call(p,y,o)===!1||k))return y.abort();if(x="abort",t.add(o.complete),y.done(o.success),y.fail(o.error),e=Kb(Gb,o,c,y)){if(y.readyState=1,l&&q.trigger("ajaxSend",[y,o]),k)return y;o.async&&o.timeout>0&&(i=a.setTimeout(function(){y.abort("timeout")},o.timeout));try{k=!1,e.send(v,A)}catch(z){if(k)throw z;A(-1,z)}}else A(-1,"No Transport");function A(b,c,d,h){var j,m,n,v,w,x=c;k||(k=!0,i&&a.clearTimeout(i),e=void 0,g=h||"",y.readyState=b>0?4:0,j=b>=200&&b<300||304===b,d&&(v=Mb(o,y,d)),v=Nb(o,v,y,j),j?(o.ifModified&&(w=y.getResponseHeader("Last-Modified"),w&&(r.lastModified[f]=w),w=y.getResponseHeader("etag"),w&&(r.etag[f]=w)),204===b||"HEAD"===o.type?x="nocontent":304===b?x="notmodified":(x=v.state,m=v.data,n=v.error,j=!n)):(n=x,!b&&x||(x="error",b<0&&(b=0))),y.status=b,y.statusText=(c||x)+"",j?s.resolveWith(p,[m,x,y]):s.rejectWith(p,[y,x,n]),y.statusCode(u),u=void 0,l&&q.trigger(j?"ajaxSuccess":"ajaxError",[y,o,j?m:n]),t.fireWith(p,[y,x]),l&&(q.trigger("ajaxComplete",[y,o]),--r.active||r.event.trigger("ajaxStop")))}return y},getJSON:function(a,b,c){return r.get(a,b,c,"json")},getScript:function(a,b){return r.get(a,void 0,b,"script")}}),r.each(["get","post"],function(a,b){r[b]=function(a,c,d,e){return r.isFunction(c)&&(e=e||d,d=c,c=void 0),r.ajax(r.extend({url:a,type:b,dataType:e,data:c,success:d},r.isPlainObject(a)&&a))}}),r._evalUrl=function(a){return r.ajax({url:a,type:"GET",dataType:"script",cache:!0,async:!1,global:!1,"throws":!0})},r.fn.extend({wrapAll:function(a){var b;return this[0]&&(r.isFunction(a)&&(a=a.call(this[0])),b=r(a,this[0].ownerDocument).eq(0).clone(!0),this[0].parentNode&&b.insertBefore(this[0]),b.map(function(){var a=this;while(a.firstElementChild)a=a.firstElementChild;return a}).append(this)),this},wrapInner:function(a){return r.isFunction(a)?this.each(function(b){r(this).wrapInner(a.call(this,b))}):this.each(function(){var b=r(this),c=b.contents();c.length?c.wrapAll(a):b.append(a)})},wrap:function(a){var b=r.isFunction(a);return this.each(function(c){r(this).wrapAll(b?a.call(this,c):a)})},unwrap:function(a){return this.parent(a).not("body").each(function(){r(this).replaceWith(this.childNodes)}),this}}),r.expr.pseudos.hidden=function(a){return!r.expr.pseudos.visible(a)},r.expr.pseudos.visible=function(a){return!!(a.offsetWidth||a.offsetHeight||a.getClientRects().length)},r.ajaxSettings.xhr=function(){try{return new a.XMLHttpRequest}catch(b){}};var Ob={0:200,1223:204},Pb=r.ajaxSettings.xhr();o.cors=!!Pb&&"withCredentials"in Pb,o.ajax=Pb=!!Pb,r.ajaxTransport(function(b){var c,d;if(o.cors||Pb&&!b.crossDomain)return{send:function(e,f){var g,h=b.xhr();if(h.open(b.type,b.url,b.async,b.username,b.password),b.xhrFields)for(g in b.xhrFields)h[g]=b.xhrFields[g];b.mimeType&&h.overrideMimeType&&h.overrideMimeType(b.mimeType),b.crossDomain||e["X-Requested-With"]||(e["X-Requested-With"]="XMLHttpRequest");for(g in e)h.setRequestHeader(g,e[g]);c=function(a){return function(){c&&(c=d=h.onload=h.onerror=h.onabort=h.onreadystatechange=null,"abort"===a?h.abort():"error"===a?"number"!=typeof h.status?f(0,"error"):f(h.status,h.statusText):f(Ob[h.status]||h.status,h.statusText,"text"!==(h.responseType||"text")||"string"!=typeof h.responseText?{binary:h.response}:{text:h.responseText},h.getAllResponseHeaders()))}},h.onload=c(),d=h.onerror=c("error"),void 0!==h.onabort?h.onabort=d:h.onreadystatechange=function(){4===h.readyState&&a.setTimeout(function(){c&&d()})},c=c("abort");try{h.send(b.hasContent&&b.data||null)}catch(i){if(c)throw i}},abort:function(){c&&c()}}}),r.ajaxPrefilter(function(a){a.crossDomain&&(a.contents.script=!1)}),r.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/\b(?:java|ecma)script\b/},converters:{"text script":function(a){return r.globalEval(a),a}}}),r.ajaxPrefilter("script",function(a){void 0===a.cache&&(a.cache=!1),a.crossDomain&&(a.type="GET")}),r.ajaxTransport("script",function(a){if(a.crossDomain){var b,c;return{send:function(e,f){b=r("<script>").prop({charset:a.scriptCharset,src:a.url}).on("load error",c=function(a){b.remove(),c=null,a&&f("error"===a.type?404:200,a.type)}),d.head.appendChild(b[0])},abort:function(){c&&c()}}}});var Qb=[],Rb=/(=)\?(?=&|$)|\?\?/;r.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var a=Qb.pop()||r.expando+"_"+rb++;return this[a]=!0,a}}),r.ajaxPrefilter("json jsonp",function(b,c,d){var e,f,g,h=b.jsonp!==!1&&(Rb.test(b.url)?"url":"string"==typeof b.data&&0===(b.contentType||"").indexOf("application/x-www-form-urlencoded")&&Rb.test(b.data)&&"data");if(h||"jsonp"===b.dataTypes[0])return e=b.jsonpCallback=r.isFunction(b.jsonpCallback)?b.jsonpCallback():b.jsonpCallback,h?b[h]=b[h].replace(Rb,"$1"+e):b.jsonp!==!1&&(b.url+=(sb.test(b.url)?"&":"?")+b.jsonp+"="+e),b.converters["script json"]=function(){return g||r.error(e+" was not called"),g[0]},b.dataTypes[0]="json",f=a[e],a[e]=function(){g=arguments},d.always(function(){void 0===f?r(a).removeProp(e):a[e]=f,b[e]&&(b.jsonpCallback=c.jsonpCallback,Qb.push(e)),g&&r.isFunction(f)&&f(g[0]),g=f=void 0}),"script"}),o.createHTMLDocument=function(){var a=d.implementation.createHTMLDocument("").body;return a.innerHTML="<form></form><form></form>",2===a.childNodes.length}(),r.parseHTML=function(a,b,c){if("string"!=typeof a)return[];"boolean"==typeof b&&(c=b,b=!1);var e,f,g;return b||(o.createHTMLDocument?(b=d.implementation.createHTMLDocument(""),e=b.createElement("base"),e.href=d.location.href,b.head.appendChild(e)):b=d),f=B.exec(a),g=!c&&[],f?[b.createElement(f[1])]:(f=pa([a],b,g),g&&g.length&&r(g).remove(),r.merge([],f.childNodes))},r.fn.load=function(a,b,c){var d,e,f,g=this,h=a.indexOf(" ");return h>-1&&(d=mb(a.slice(h)),a=a.slice(0,h)),r.isFunction(b)?(c=b,b=void 0):b&&"object"==typeof b&&(e="POST"),g.length>0&&r.ajax({url:a,type:e||"GET",dataType:"html",data:b}).done(function(a){f=arguments,g.html(d?r("<div>").append(r.parseHTML(a)).find(d):a)}).always(c&&function(a,b){g.each(function(){c.apply(this,f||[a.responseText,b,a])})}),this},r.each(["ajaxStart","ajaxStop","ajaxComplete","ajaxError","ajaxSuccess","ajaxSend"],function(a,b){r.fn[b]=function(a){return this.on(b,a)}}),r.expr.pseudos.animated=function(a){return r.grep(r.timers,function(b){return a===b.elem}).length};function Sb(a){return r.isWindow(a)?a:9===a.nodeType&&a.defaultView}r.offset={setOffset:function(a,b,c){var d,e,f,g,h,i,j,k=r.css(a,"position"),l=r(a),m={};"static"===k&&(a.style.position="relative"),h=l.offset(),f=r.css(a,"top"),i=r.css(a,"left"),j=("absolute"===k||"fixed"===k)&&(f+i).indexOf("auto")>-1,j?(d=l.position(),g=d.top,e=d.left):(g=parseFloat(f)||0,e=parseFloat(i)||0),r.isFunction(b)&&(b=b.call(a,c,r.extend({},h))),null!=b.top&&(m.top=b.top-h.top+g),null!=b.left&&(m.left=b.left-h.left+e),"using"in b?b.using.call(a,m):l.css(m)}},r.fn.extend({offset:function(a){if(arguments.length)return void 0===a?this:this.each(function(b){r.offset.setOffset(this,a,b)});var b,c,d,e,f=this[0];if(f)return f.getClientRects().length?(d=f.getBoundingClientRect(),d.width||d.height?(e=f.ownerDocument,c=Sb(e),b=e.documentElement,{top:d.top+c.pageYOffset-b.clientTop,left:d.left+c.pageXOffset-b.clientLeft}):d):{top:0,left:0}},position:function(){if(this[0]){var a,b,c=this[0],d={top:0,left:0};return"fixed"===r.css(c,"position")?b=c.getBoundingClientRect():(a=this.offsetParent(),b=this.offset(),r.nodeName(a[0],"html")||(d=a.offset()),d={top:d.top+r.css(a[0],"borderTopWidth",!0),left:d.left+r.css(a[0],"borderLeftWidth",!0)}),{top:b.top-d.top-r.css(c,"marginTop",!0),left:b.left-d.left-r.css(c,"marginLeft",!0)}}},offsetParent:function(){return this.map(function(){var a=this.offsetParent;while(a&&"static"===r.css(a,"position"))a=a.offsetParent;return a||qa})}}),r.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(a,b){var c="pageYOffset"===b;r.fn[a]=function(d){return S(this,function(a,d,e){var f=Sb(a);return void 0===e?f?f[b]:a[d]:void(f?f.scrollTo(c?f.pageXOffset:e,c?e:f.pageYOffset):a[d]=e)},a,d,arguments.length)}}),r.each(["top","left"],function(a,b){r.cssHooks[b]=Oa(o.pixelPosition,function(a,c){if(c)return c=Na(a,b),La.test(c)?r(a).position()[b]+"px":c})}),r.each({Height:"height",Width:"width"},function(a,b){r.each({padding:"inner"+a,content:b,"":"outer"+a},function(c,d){r.fn[d]=function(e,f){var g=arguments.length&&(c||"boolean"!=typeof e),h=c||(e===!0||f===!0?"margin":"border");return S(this,function(b,c,e){var f;return r.isWindow(b)?0===d.indexOf("outer")?b["inner"+a]:b.document.documentElement["client"+a]:9===b.nodeType?(f=b.documentElement,Math.max(b.body["scroll"+a],f["scroll"+a],b.body["offset"+a],f["offset"+a],f["client"+a])):void 0===e?r.css(b,c,h):r.style(b,c,e,h)},b,g?e:void 0,g)}})}),r.fn.extend({bind:function(a,b,c){return this.on(a,null,b,c)},unbind:function(a,b){return this.off(a,null,b)},delegate:function(a,b,c,d){return this.on(b,a,c,d)},undelegate:function(a,b,c){return 1===arguments.length?this.off(a,"**"):this.off(b,a||"**",c)}}),r.parseJSON=JSON.parse,"function"==typeof define&&define.amd&&define("jquery",[],function(){return r});var Tb=a.jQuery,Ub=a.$;return r.noConflict=function(b){return a.$===r&&(a.$=Ub),b&&a.jQuery===r&&(a.jQuery=Tb),r},b||(a.jQuery=a.$=r),r});

(function(t){var e=typeof self=="object"&&self.self===self&&self||typeof global=="object"&&global.global===global&&global;if(typeof define==="function"&&define.amd){define('backbone',["underscore","jquery","exports"],function(i,r,n){e.Backbone=t(e,n,i,r)})}else if(typeof exports!=="undefined"){var i=require("underscore"),r;try{r=require("jquery")}catch(n){}t(e,exports,i,r)}else{e.Backbone=t(e,{},e._,e.jQuery||e.Zepto||e.ender||e.$)}})(function(t,e,i,r){var n=t.Backbone;var s=Array.prototype.slice;e.VERSION="1.3.3";e.$=r;e.noConflict=function(){t.Backbone=n;return this};e.emulateHTTP=false;e.emulateJSON=false;var a=function(t,e,r){switch(t){case 1:return function(){return i[e](this[r])};case 2:return function(t){return i[e](this[r],t)};case 3:return function(t,n){return i[e](this[r],o(t,this),n)};case 4:return function(t,n,s){return i[e](this[r],o(t,this),n,s)};default:return function(){var t=s.call(arguments);t.unshift(this[r]);return i[e].apply(i,t)}}};var h=function(t,e,r){i.each(e,function(e,n){if(i[n])t.prototype[n]=a(e,n,r)})};var o=function(t,e){if(i.isFunction(t))return t;if(i.isObject(t)&&!e._isModel(t))return l(t);if(i.isString(t))return function(e){return e.get(t)};return t};var l=function(t){var e=i.matches(t);return function(t){return e(t.attributes)}};var u=e.Events={};var c=/\s+/;var f=function(t,e,r,n,s){var a=0,h;if(r&&typeof r==="object"){if(n!==void 0&&"context"in s&&s.context===void 0)s.context=n;for(h=i.keys(r);a<h.length;a++){e=f(t,e,h[a],r[h[a]],s)}}else if(r&&c.test(r)){for(h=r.split(c);a<h.length;a++){e=t(e,h[a],n,s)}}else{e=t(e,r,n,s)}return e};u.on=function(t,e,i){return d(this,t,e,i)};var d=function(t,e,i,r,n){t._events=f(v,t._events||{},e,i,{context:r,ctx:t,listening:n});if(n){var s=t._listeners||(t._listeners={});s[n.id]=n}return t};u.listenTo=function(t,e,r){if(!t)return this;var n=t._listenId||(t._listenId=i.uniqueId("l"));var s=this._listeningTo||(this._listeningTo={});var a=s[n];if(!a){var h=this._listenId||(this._listenId=i.uniqueId("l"));a=s[n]={obj:t,objId:n,id:h,listeningTo:s,count:0}}d(t,e,r,this,a);return this};var v=function(t,e,i,r){if(i){var n=t[e]||(t[e]=[]);var s=r.context,a=r.ctx,h=r.listening;if(h)h.count++;n.push({callback:i,context:s,ctx:s||a,listening:h})}return t};u.off=function(t,e,i){if(!this._events)return this;this._events=f(g,this._events,t,e,{context:i,listeners:this._listeners});return this};u.stopListening=function(t,e,r){var n=this._listeningTo;if(!n)return this;var s=t?[t._listenId]:i.keys(n);for(var a=0;a<s.length;a++){var h=n[s[a]];if(!h)break;h.obj.off(e,r,this)}return this};var g=function(t,e,r,n){if(!t)return;var s=0,a;var h=n.context,o=n.listeners;if(!e&&!r&&!h){var l=i.keys(o);for(;s<l.length;s++){a=o[l[s]];delete o[a.id];delete a.listeningTo[a.objId]}return}var u=e?[e]:i.keys(t);for(;s<u.length;s++){e=u[s];var c=t[e];if(!c)break;var f=[];for(var d=0;d<c.length;d++){var v=c[d];if(r&&r!==v.callback&&r!==v.callback._callback||h&&h!==v.context){f.push(v)}else{a=v.listening;if(a&&--a.count===0){delete o[a.id];delete a.listeningTo[a.objId]}}}if(f.length){t[e]=f}else{delete t[e]}}return t};u.once=function(t,e,r){var n=f(p,{},t,e,i.bind(this.off,this));if(typeof t==="string"&&r==null)e=void 0;return this.on(n,e,r)};u.listenToOnce=function(t,e,r){var n=f(p,{},e,r,i.bind(this.stopListening,this,t));return this.listenTo(t,n)};var p=function(t,e,r,n){if(r){var s=t[e]=i.once(function(){n(e,s);r.apply(this,arguments)});s._callback=r}return t};u.trigger=function(t){if(!this._events)return this;var e=Math.max(0,arguments.length-1);var i=Array(e);for(var r=0;r<e;r++)i[r]=arguments[r+1];f(m,this._events,t,void 0,i);return this};var m=function(t,e,i,r){if(t){var n=t[e];var s=t.all;if(n&&s)s=s.slice();if(n)_(n,r);if(s)_(s,[e].concat(r))}return t};var _=function(t,e){var i,r=-1,n=t.length,s=e[0],a=e[1],h=e[2];switch(e.length){case 0:while(++r<n)(i=t[r]).callback.call(i.ctx);return;case 1:while(++r<n)(i=t[r]).callback.call(i.ctx,s);return;case 2:while(++r<n)(i=t[r]).callback.call(i.ctx,s,a);return;case 3:while(++r<n)(i=t[r]).callback.call(i.ctx,s,a,h);return;default:while(++r<n)(i=t[r]).callback.apply(i.ctx,e);return}};u.bind=u.on;u.unbind=u.off;i.extend(e,u);var y=e.Model=function(t,e){var r=t||{};e||(e={});this.cid=i.uniqueId(this.cidPrefix);this.attributes={};if(e.collection)this.collection=e.collection;if(e.parse)r=this.parse(r,e)||{};var n=i.result(this,"defaults");r=i.defaults(i.extend({},n,r),n);this.set(r,e);this.changed={};this.initialize.apply(this,arguments)};i.extend(y.prototype,u,{changed:null,validationError:null,idAttribute:"id",cidPrefix:"c",initialize:function(){},toJSON:function(t){return i.clone(this.attributes)},sync:function(){return e.sync.apply(this,arguments)},get:function(t){return this.attributes[t]},escape:function(t){return i.escape(this.get(t))},has:function(t){return this.get(t)!=null},matches:function(t){return!!i.iteratee(t,this)(this.attributes)},set:function(t,e,r){if(t==null)return this;var n;if(typeof t==="object"){n=t;r=e}else{(n={})[t]=e}r||(r={});if(!this._validate(n,r))return false;var s=r.unset;var a=r.silent;var h=[];var o=this._changing;this._changing=true;if(!o){this._previousAttributes=i.clone(this.attributes);this.changed={}}var l=this.attributes;var u=this.changed;var c=this._previousAttributes;for(var f in n){e=n[f];if(!i.isEqual(l[f],e))h.push(f);if(!i.isEqual(c[f],e)){u[f]=e}else{delete u[f]}s?delete l[f]:l[f]=e}if(this.idAttribute in n)this.id=this.get(this.idAttribute);if(!a){if(h.length)this._pending=r;for(var d=0;d<h.length;d++){this.trigger("change:"+h[d],this,l[h[d]],r)}}if(o)return this;if(!a){while(this._pending){r=this._pending;this._pending=false;this.trigger("change",this,r)}}this._pending=false;this._changing=false;return this},unset:function(t,e){return this.set(t,void 0,i.extend({},e,{unset:true}))},clear:function(t){var e={};for(var r in this.attributes)e[r]=void 0;return this.set(e,i.extend({},t,{unset:true}))},hasChanged:function(t){if(t==null)return!i.isEmpty(this.changed);return i.has(this.changed,t)},changedAttributes:function(t){if(!t)return this.hasChanged()?i.clone(this.changed):false;var e=this._changing?this._previousAttributes:this.attributes;var r={};for(var n in t){var s=t[n];if(i.isEqual(e[n],s))continue;r[n]=s}return i.size(r)?r:false},previous:function(t){if(t==null||!this._previousAttributes)return null;return this._previousAttributes[t]},previousAttributes:function(){return i.clone(this._previousAttributes)},fetch:function(t){t=i.extend({parse:true},t);var e=this;var r=t.success;t.success=function(i){var n=t.parse?e.parse(i,t):i;if(!e.set(n,t))return false;if(r)r.call(t.context,e,i,t);e.trigger("sync",e,i,t)};B(this,t);return this.sync("read",this,t)},save:function(t,e,r){var n;if(t==null||typeof t==="object"){n=t;r=e}else{(n={})[t]=e}r=i.extend({validate:true,parse:true},r);var s=r.wait;if(n&&!s){if(!this.set(n,r))return false}else if(!this._validate(n,r)){return false}var a=this;var h=r.success;var o=this.attributes;r.success=function(t){a.attributes=o;var e=r.parse?a.parse(t,r):t;if(s)e=i.extend({},n,e);if(e&&!a.set(e,r))return false;if(h)h.call(r.context,a,t,r);a.trigger("sync",a,t,r)};B(this,r);if(n&&s)this.attributes=i.extend({},o,n);var l=this.isNew()?"create":r.patch?"patch":"update";if(l==="patch"&&!r.attrs)r.attrs=n;var u=this.sync(l,this,r);this.attributes=o;return u},destroy:function(t){t=t?i.clone(t):{};var e=this;var r=t.success;var n=t.wait;var s=function(){e.stopListening();e.trigger("destroy",e,e.collection,t)};t.success=function(i){if(n)s();if(r)r.call(t.context,e,i,t);if(!e.isNew())e.trigger("sync",e,i,t)};var a=false;if(this.isNew()){i.defer(t.success)}else{B(this,t);a=this.sync("delete",this,t)}if(!n)s();return a},url:function(){var t=i.result(this,"urlRoot")||i.result(this.collection,"url")||F();if(this.isNew())return t;var e=this.get(this.idAttribute);return t.replace(/[^\/]$/,"$&/")+encodeURIComponent(e)},parse:function(t,e){return t},clone:function(){return new this.constructor(this.attributes)},isNew:function(){return!this.has(this.idAttribute)},isValid:function(t){return this._validate({},i.extend({},t,{validate:true}))},_validate:function(t,e){if(!e.validate||!this.validate)return true;t=i.extend({},this.attributes,t);var r=this.validationError=this.validate(t,e)||null;if(!r)return true;this.trigger("invalid",this,r,i.extend(e,{validationError:r}));return false}});var b={keys:1,values:1,pairs:1,invert:1,pick:0,omit:0,chain:1,isEmpty:1};h(y,b,"attributes");var x=e.Collection=function(t,e){e||(e={});if(e.model)this.model=e.model;if(e.comparator!==void 0)this.comparator=e.comparator;this._reset();this.initialize.apply(this,arguments);if(t)this.reset(t,i.extend({silent:true},e))};var w={add:true,remove:true,merge:true};var E={add:true,remove:false};var I=function(t,e,i){i=Math.min(Math.max(i,0),t.length);var r=Array(t.length-i);var n=e.length;var s;for(s=0;s<r.length;s++)r[s]=t[s+i];for(s=0;s<n;s++)t[s+i]=e[s];for(s=0;s<r.length;s++)t[s+n+i]=r[s]};i.extend(x.prototype,u,{model:y,initialize:function(){},toJSON:function(t){return this.map(function(e){return e.toJSON(t)})},sync:function(){return e.sync.apply(this,arguments)},add:function(t,e){return this.set(t,i.extend({merge:false},e,E))},remove:function(t,e){e=i.extend({},e);var r=!i.isArray(t);t=r?[t]:t.slice();var n=this._removeModels(t,e);if(!e.silent&&n.length){e.changes={added:[],merged:[],removed:n};this.trigger("update",this,e)}return r?n[0]:n},set:function(t,e){if(t==null)return;e=i.extend({},w,e);if(e.parse&&!this._isModel(t)){t=this.parse(t,e)||[]}var r=!i.isArray(t);t=r?[t]:t.slice();var n=e.at;if(n!=null)n=+n;if(n>this.length)n=this.length;if(n<0)n+=this.length+1;var s=[];var a=[];var h=[];var o=[];var l={};var u=e.add;var c=e.merge;var f=e.remove;var d=false;var v=this.comparator&&n==null&&e.sort!==false;var g=i.isString(this.comparator)?this.comparator:null;var p,m;for(m=0;m<t.length;m++){p=t[m];var _=this.get(p);if(_){if(c&&p!==_){var y=this._isModel(p)?p.attributes:p;if(e.parse)y=_.parse(y,e);_.set(y,e);h.push(_);if(v&&!d)d=_.hasChanged(g)}if(!l[_.cid]){l[_.cid]=true;s.push(_)}t[m]=_}else if(u){p=t[m]=this._prepareModel(p,e);if(p){a.push(p);this._addReference(p,e);l[p.cid]=true;s.push(p)}}}if(f){for(m=0;m<this.length;m++){p=this.models[m];if(!l[p.cid])o.push(p)}if(o.length)this._removeModels(o,e)}var b=false;var x=!v&&u&&f;if(s.length&&x){b=this.length!==s.length||i.some(this.models,function(t,e){return t!==s[e]});this.models.length=0;I(this.models,s,0);this.length=this.models.length}else if(a.length){if(v)d=true;I(this.models,a,n==null?this.length:n);this.length=this.models.length}if(d)this.sort({silent:true});if(!e.silent){for(m=0;m<a.length;m++){if(n!=null)e.index=n+m;p=a[m];p.trigger("add",p,this,e)}if(d||b)this.trigger("sort",this,e);if(a.length||o.length||h.length){e.changes={added:a,removed:o,merged:h};this.trigger("update",this,e)}}return r?t[0]:t},reset:function(t,e){e=e?i.clone(e):{};for(var r=0;r<this.models.length;r++){this._removeReference(this.models[r],e)}e.previousModels=this.models;this._reset();t=this.add(t,i.extend({silent:true},e));if(!e.silent)this.trigger("reset",this,e);return t},push:function(t,e){return this.add(t,i.extend({at:this.length},e))},pop:function(t){var e=this.at(this.length-1);return this.remove(e,t)},unshift:function(t,e){return this.add(t,i.extend({at:0},e))},shift:function(t){var e=this.at(0);return this.remove(e,t)},slice:function(){return s.apply(this.models,arguments)},get:function(t){if(t==null)return void 0;return this._byId[t]||this._byId[this.modelId(t.attributes||t)]||t.cid&&this._byId[t.cid]},has:function(t){return this.get(t)!=null},at:function(t){if(t<0)t+=this.length;return this.models[t]},where:function(t,e){return this[e?"find":"filter"](t)},findWhere:function(t){return this.where(t,true)},sort:function(t){var e=this.comparator;if(!e)throw new Error("Cannot sort a set without a comparator");t||(t={});var r=e.length;if(i.isFunction(e))e=i.bind(e,this);if(r===1||i.isString(e)){this.models=this.sortBy(e)}else{this.models.sort(e)}if(!t.silent)this.trigger("sort",this,t);return this},pluck:function(t){return this.map(t+"")},fetch:function(t){t=i.extend({parse:true},t);var e=t.success;var r=this;t.success=function(i){var n=t.reset?"reset":"set";r[n](i,t);if(e)e.call(t.context,r,i,t);r.trigger("sync",r,i,t)};B(this,t);return this.sync("read",this,t)},create:function(t,e){e=e?i.clone(e):{};var r=e.wait;t=this._prepareModel(t,e);if(!t)return false;if(!r)this.add(t,e);var n=this;var s=e.success;e.success=function(t,e,i){if(r)n.add(t,i);if(s)s.call(i.context,t,e,i)};t.save(null,e);return t},parse:function(t,e){return t},clone:function(){return new this.constructor(this.models,{model:this.model,comparator:this.comparator})},modelId:function(t){return t[this.model.prototype.idAttribute||"id"]},_reset:function(){this.length=0;this.models=[];this._byId={}},_prepareModel:function(t,e){if(this._isModel(t)){if(!t.collection)t.collection=this;return t}e=e?i.clone(e):{};e.collection=this;var r=new this.model(t,e);if(!r.validationError)return r;this.trigger("invalid",this,r.validationError,e);return false},_removeModels:function(t,e){var i=[];for(var r=0;r<t.length;r++){var n=this.get(t[r]);if(!n)continue;var s=this.indexOf(n);this.models.splice(s,1);this.length--;delete this._byId[n.cid];var a=this.modelId(n.attributes);if(a!=null)delete this._byId[a];if(!e.silent){e.index=s;n.trigger("remove",n,this,e)}i.push(n);this._removeReference(n,e)}return i},_isModel:function(t){return t instanceof y},_addReference:function(t,e){this._byId[t.cid]=t;var i=this.modelId(t.attributes);if(i!=null)this._byId[i]=t;t.on("all",this._onModelEvent,this)},_removeReference:function(t,e){delete this._byId[t.cid];var i=this.modelId(t.attributes);if(i!=null)delete this._byId[i];if(this===t.collection)delete t.collection;t.off("all",this._onModelEvent,this)},_onModelEvent:function(t,e,i,r){if(e){if((t==="add"||t==="remove")&&i!==this)return;if(t==="destroy")this.remove(e,r);if(t==="change"){var n=this.modelId(e.previousAttributes());var s=this.modelId(e.attributes);if(n!==s){if(n!=null)delete this._byId[n];if(s!=null)this._byId[s]=e}}}this.trigger.apply(this,arguments)}});var S={forEach:3,each:3,map:3,collect:3,reduce:0,foldl:0,inject:0,reduceRight:0,foldr:0,find:3,detect:3,filter:3,select:3,reject:3,every:3,all:3,some:3,any:3,include:3,includes:3,contains:3,invoke:0,max:3,min:3,toArray:1,size:1,first:3,head:3,take:3,initial:3,rest:3,tail:3,drop:3,last:3,without:0,difference:0,indexOf:3,shuffle:1,lastIndexOf:3,isEmpty:1,chain:1,sample:3,partition:3,groupBy:3,countBy:3,sortBy:3,indexBy:3,findIndex:3,findLastIndex:3};h(x,S,"models");var k=e.View=function(t){this.cid=i.uniqueId("view");i.extend(this,i.pick(t,P));this._ensureElement();this.initialize.apply(this,arguments)};var T=/^(\S+)\s*(.*)$/;var P=["model","collection","el","id","attributes","className","tagName","events"];i.extend(k.prototype,u,{tagName:"div",$:function(t){return this.$el.find(t)},initialize:function(){},render:function(){return this},remove:function(){this._removeElement();this.stopListening();return this},_removeElement:function(){this.$el.remove()},setElement:function(t){this.undelegateEvents();this._setElement(t);this.delegateEvents();return this},_setElement:function(t){this.$el=t instanceof e.$?t:e.$(t);this.el=this.$el[0]},delegateEvents:function(t){t||(t=i.result(this,"events"));if(!t)return this;this.undelegateEvents();for(var e in t){var r=t[e];if(!i.isFunction(r))r=this[r];if(!r)continue;var n=e.match(T);this.delegate(n[1],n[2],i.bind(r,this))}return this},delegate:function(t,e,i){this.$el.on(t+".delegateEvents"+this.cid,e,i);return this},undelegateEvents:function(){if(this.$el)this.$el.off(".delegateEvents"+this.cid);return this},undelegate:function(t,e,i){this.$el.off(t+".delegateEvents"+this.cid,e,i);return this},_createElement:function(t){return document.createElement(t)},_ensureElement:function(){if(!this.el){var t=i.extend({},i.result(this,"attributes"));if(this.id)t.id=i.result(this,"id");if(this.className)t["class"]=i.result(this,"className");this.setElement(this._createElement(i.result(this,"tagName")));this._setAttributes(t)}else{this.setElement(i.result(this,"el"))}},_setAttributes:function(t){this.$el.attr(t)}});e.sync=function(t,r,n){var s=H[t];i.defaults(n||(n={}),{emulateHTTP:e.emulateHTTP,emulateJSON:e.emulateJSON});var a={type:s,dataType:"json"};if(!n.url){a.url=i.result(r,"url")||F()}if(n.data==null&&r&&(t==="create"||t==="update"||t==="patch")){a.contentType="application/json";a.data=JSON.stringify(n.attrs||r.toJSON(n))}if(n.emulateJSON){a.contentType="application/x-www-form-urlencoded";a.data=a.data?{model:a.data}:{}}if(n.emulateHTTP&&(s==="PUT"||s==="DELETE"||s==="PATCH")){a.type="POST";if(n.emulateJSON)a.data._method=s;var h=n.beforeSend;n.beforeSend=function(t){t.setRequestHeader("X-HTTP-Method-Override",s);if(h)return h.apply(this,arguments)}}if(a.type!=="GET"&&!n.emulateJSON){a.processData=false}var o=n.error;n.error=function(t,e,i){n.textStatus=e;n.errorThrown=i;if(o)o.call(n.context,t,e,i)};var l=n.xhr=e.ajax(i.extend(a,n));r.trigger("request",r,l,n);return l};var H={create:"POST",update:"PUT",patch:"PATCH","delete":"DELETE",read:"GET"};e.ajax=function(){return e.$.ajax.apply(e.$,arguments)};var $=e.Router=function(t){t||(t={});if(t.routes)this.routes=t.routes;this._bindRoutes();this.initialize.apply(this,arguments)};var A=/\((.*?)\)/g;var C=/(\(\?)?:\w+/g;var R=/\*\w+/g;var j=/[\-{}\[\]+?.,\\\^$|#\s]/g;i.extend($.prototype,u,{initialize:function(){},route:function(t,r,n){if(!i.isRegExp(t))t=this._routeToRegExp(t);if(i.isFunction(r)){n=r;r=""}if(!n)n=this[r];var s=this;e.history.route(t,function(i){var a=s._extractParameters(t,i);if(s.execute(n,a,r)!==false){s.trigger.apply(s,["route:"+r].concat(a));s.trigger("route",r,a);e.history.trigger("route",s,r,a)}});return this},execute:function(t,e,i){if(t)t.apply(this,e)},navigate:function(t,i){e.history.navigate(t,i);return this},_bindRoutes:function(){if(!this.routes)return;this.routes=i.result(this,"routes");var t,e=i.keys(this.routes);while((t=e.pop())!=null){this.route(t,this.routes[t])}},_routeToRegExp:function(t){t=t.replace(j,"\\$&").replace(A,"(?:$1)?").replace(C,function(t,e){return e?t:"([^/?]+)"}).replace(R,"([^?]*?)");return new RegExp("^"+t+"(?:\\?([\\s\\S]*))?$")},_extractParameters:function(t,e){var r=t.exec(e).slice(1);return i.map(r,function(t,e){if(e===r.length-1)return t||null;return t?decodeURIComponent(t):null})}});var N=e.History=function(){this.handlers=[];this.checkUrl=i.bind(this.checkUrl,this);if(typeof window!=="undefined"){this.location=window.location;this.history=window.history}};var M=/^[#\/]|\s+$/g;var O=/^\/+|\/+$/g;var U=/#.*$/;N.started=false;i.extend(N.prototype,u,{interval:50,atRoot:function(){var t=this.location.pathname.replace(/[^\/]$/,"$&/");return t===this.root&&!this.getSearch()},matchRoot:function(){var t=this.decodeFragment(this.location.pathname);var e=t.slice(0,this.root.length-1)+"/";return e===this.root},decodeFragment:function(t){return decodeURI(t.replace(/%25/g,"%2525"))},getSearch:function(){var t=this.location.href.replace(/#.*/,"").match(/\?.+/);return t?t[0]:""},getHash:function(t){var e=(t||this).location.href.match(/#(.*)$/);return e?e[1]:""},getPath:function(){var t=this.decodeFragment(this.location.pathname+this.getSearch()).slice(this.root.length-1);return t.charAt(0)==="/"?t.slice(1):t},getFragment:function(t){if(t==null){if(this._usePushState||!this._wantsHashChange){t=this.getPath()}else{t=this.getHash()}}return t.replace(M,"")},start:function(t){if(N.started)throw new Error("Backbone.history has already been started");N.started=true;this.options=i.extend({root:"/"},this.options,t);this.root=this.options.root;this._wantsHashChange=this.options.hashChange!==false;this._hasHashChange="onhashchange"in window&&(document.documentMode===void 0||document.documentMode>7);this._useHashChange=this._wantsHashChange&&this._hasHashChange;this._wantsPushState=!!this.options.pushState;this._hasPushState=!!(this.history&&this.history.pushState);this._usePushState=this._wantsPushState&&this._hasPushState;this.fragment=this.getFragment();this.root=("/"+this.root+"/").replace(O,"/");if(this._wantsHashChange&&this._wantsPushState){if(!this._hasPushState&&!this.atRoot()){var e=this.root.slice(0,-1)||"/";this.location.replace(e+"#"+this.getPath());return true}else if(this._hasPushState&&this.atRoot()){this.navigate(this.getHash(),{replace:true})}}if(!this._hasHashChange&&this._wantsHashChange&&!this._usePushState){this.iframe=document.createElement("iframe");this.iframe.src="javascript:0";this.iframe.style.display="none";this.iframe.tabIndex=-1;var r=document.body;var n=r.insertBefore(this.iframe,r.firstChild).contentWindow;n.document.open();n.document.close();n.location.hash="#"+this.fragment}var s=window.addEventListener||function(t,e){return attachEvent("on"+t,e)};if(this._usePushState){s("popstate",this.checkUrl,false)}else if(this._useHashChange&&!this.iframe){s("hashchange",this.checkUrl,false)}else if(this._wantsHashChange){this._checkUrlInterval=setInterval(this.checkUrl,this.interval)}if(!this.options.silent)return this.loadUrl()},stop:function(){var t=window.removeEventListener||function(t,e){return detachEvent("on"+t,e)};if(this._usePushState){t("popstate",this.checkUrl,false)}else if(this._useHashChange&&!this.iframe){t("hashchange",this.checkUrl,false)}if(this.iframe){document.body.removeChild(this.iframe);this.iframe=null}if(this._checkUrlInterval)clearInterval(this._checkUrlInterval);N.started=false},route:function(t,e){this.handlers.unshift({route:t,callback:e})},checkUrl:function(t){var e=this.getFragment();if(e===this.fragment&&this.iframe){e=this.getHash(this.iframe.contentWindow)}if(e===this.fragment)return false;if(this.iframe)this.navigate(e);this.loadUrl()},loadUrl:function(t){if(!this.matchRoot())return false;t=this.fragment=this.getFragment(t);return i.some(this.handlers,function(e){if(e.route.test(t)){e.callback(t);return true}})},navigate:function(t,e){if(!N.started)return false;if(!e||e===true)e={trigger:!!e};t=this.getFragment(t||"");var i=this.root;if(t===""||t.charAt(0)==="?"){i=i.slice(0,-1)||"/"}var r=i+t;t=this.decodeFragment(t.replace(U,""));if(this.fragment===t)return;this.fragment=t;if(this._usePushState){this.history[e.replace?"replaceState":"pushState"]({},document.title,r)}else if(this._wantsHashChange){this._updateHash(this.location,t,e.replace);if(this.iframe&&t!==this.getHash(this.iframe.contentWindow)){var n=this.iframe.contentWindow;if(!e.replace){n.document.open();n.document.close()}this._updateHash(n.location,t,e.replace)}}else{return this.location.assign(r)}if(e.trigger)return this.loadUrl(t)},_updateHash:function(t,e,i){if(i){var r=t.href.replace(/(javascript:|#).*$/,"");t.replace(r+"#"+e)}else{t.hash="#"+e}}});e.history=new N;var q=function(t,e){var r=this;var n;if(t&&i.has(t,"constructor")){n=t.constructor}else{n=function(){return r.apply(this,arguments)}}i.extend(n,r,e);n.prototype=i.create(r.prototype,t);n.prototype.constructor=n;n.__super__=r.prototype;return n};y.extend=x.extend=$.extend=k.extend=N.extend=q;var F=function(){throw new Error('A "url" property or function must be specified')};var B=function(t,e){var i=e.error;e.error=function(r){if(i)i.call(e.context,t,r,e);t.trigger("error",t,r,e)}};return e});
//# sourceMappingURL=backbone-min.map;
// Backbone.Radio v2.0.0
!function (e, n) {
    "object" == typeof exports && "undefined" != typeof module ? module.exports = n(require("underscore"), require("backbone")) : "function" == typeof define && define.amd ? define('backbone.radio',["underscore", "backbone"], n) : (e.Backbone = e.Backbone || {}, e.Backbone.Radio = n(e._, e.Backbone))
}(this, function (e, n) {
    "use strict";
    function t(e, n, t, r) {
        var o = e[n];
        if (!(t && t !== o.callback && t !== o.callback._callback || r && r !== o.context))return delete e[n], !0
    }

    function r(n, r, o, i) {
        n || (n = {});
        for (var s = r ? [r] : e.keys(n), u = !1, c = 0, a = s.length; c < a; c++)r = s[c], n[r] && t(n, r, o, i) && (u = !0);
        return u
    }

    function o(n) {
        return l[n] || (l[n] = e.bind(c.log, c, n))
    }

    function i(n) {
        return e.isFunction(n) ? n : function () {
            return n
        }
    }

    e = "default" in e ? e["default"] : e, n = "default" in n ? n["default"] : n;
    var s = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (e) {
        return typeof e
    } : function (e) {
        return e && "function" == typeof Symbol && e.constructor === Symbol ? "symbol" : typeof e
    }, u = n.Radio, c = n.Radio = {};
    c.VERSION = "2.0.0", c.noConflict = function () {
        return n.Radio = u, this
    }, c.DEBUG = !1, c._debugText = function (e, n, t) {
        return e + (t ? " on the " + t + " channel" : "") + ': "' + n + '"'
    }, c.debugLog = function (e, n, t) {
        c.DEBUG && console && console.warn && console.warn(c._debugText(e, n, t))
    };
    var a = /\s+/;
    c._eventsApi = function (n, t, r, o) {
        if (!r)return !1;
        var i = {};
        if ("object" === ("undefined" == typeof r ? "undefined" : s(r))) {
            for (var u in r) {
                var c = n[t].apply(n, [u, r[u]].concat(o));
                a.test(u) ? e.extend(i, c) : i[u] = c
            }
            return i
        }
        if (a.test(r)) {
            for (var l = r.split(a), f = 0, h = l.length; f < h; f++)i[l[f]] = n[t].apply(n, [l[f]].concat(o));
            return i
        }
        return !1
    }, c._callHandler = function (e, n, t) {
        var r = t[0], o = t[1], i = t[2];
        switch (t.length) {
        case 0:
            return e.call(n);
        case 1:
            return e.call(n, r);
        case 2:
            return e.call(n, r, o);
        case 3:
            return e.call(n, r, o, i);
        default:
            return e.apply(n, t)
        }
    };
    var l = {};
    e.extend(c, {
        log: function (n, t) {
            if ("undefined" != typeof console) {
                var r = e.toArray(arguments).slice(2);
                console.log("[" + n + '] "' + t + '"', r)
            }
        }, tuneIn: function (e) {
            var n = c.channel(e);
            return n._tunedIn = !0, n.on("all", o(e)), this
        }, tuneOut: function (e) {
            var n = c.channel(e);
            return n._tunedIn = !1, n.off("all", o(e)), delete l[e], this
        }
    }), c.Requests = {
        request: function (n) {
            var t = e.toArray(arguments).slice(1), r = c._eventsApi(this, "request", n, t);
            if (r)return r;
            var o = this.channelName, i = this._requests;
            if (o && this._tunedIn && c.log.apply(this, [o, n].concat(t)), i && (i[n] || i["default"])) {
                var s = i[n] || i["default"];
                return t = i[n] ? t : arguments, c._callHandler(s.callback, s.context, t)
            }
            c.debugLog("An unhandled request was fired", n, o)
        }, reply: function (e, n, t) {
            return c._eventsApi(this, "reply", e, [n, t]) ? this : (this._requests || (this._requests = {}), this._requests[e] && c.debugLog("A request was overwritten", e, this.channelName), this._requests[e] = {
                callback: i(n),
                context: t || this
            }, this)
        }, replyOnce: function (n, t, r) {
            if (c._eventsApi(this, "replyOnce", n, [t, r]))return this;
            var o = this, s = e.once(function () {
                return o.stopReplying(n), i(t).apply(this, arguments)
            });
            return this.reply(n, s, r)
        }, stopReplying: function (e, n, t) {
            return c._eventsApi(this, "stopReplying", e) ? this : (e || n || t ? r(this._requests, e, n, t) || c.debugLog("Attempted to remove the unregistered request", e, this.channelName) : delete this._requests, this)
        }
    }, c._channels = {}, c.channel = function (e) {
        if (!e)throw new Error("You must provide a name for the channel.");
        return c._channels[e] ? c._channels[e] : c._channels[e] = new c.Channel(e)
    }, c.Channel = function (e) {
        this.channelName = e
    }, e.extend(c.Channel.prototype, n.Events, c.Requests, {
        reset: function () {
            return this.off(), this.stopListening(), this.stopReplying(), this
        }
    });
    var f, h, d = [n.Events, c.Requests];
    return e.each(d, function (n) {
        e.each(n, function (n, t) {
            c[t] = function (n) {
                return h = e.toArray(arguments).slice(1), f = this.channel(n), f[t].apply(f, h)
            }
        })
    }), c.reset = function (n) {
        var t = n ? [this._channels[n]] : this._channels;
        e.each(t, function (e) {
            e.reset()
        })
    }, c
});
//# sourceMappingURL=backbone.radio.min.js.map
;
// MarionetteJS (Backbone.Marionette)
// ----------------------------------
// v3.1.0
//
// Copyright (c)2016 Derick Bailey, Muted Solutions, LLC.
// Distributed under MIT license
//
// http://marionettejs.com
!function (e, t) {
    "object" == typeof exports && "undefined" != typeof module ? module.exports = t(require("backbone"), require("underscore"), require("backbone.radio")) : "function" == typeof define && define.amd ? define('marionette',["backbone", "underscore", "backbone.radio"], t) : e.Marionette = e.Mn = t(e.Backbone, e._, e.Backbone.Radio)
}(this, function (e, t, i) {
    "use strict";
    function n(e, t, i) {
        return i.toUpperCase()
    }

    function r(e) {
        for (var i = arguments.length, n = Array(i > 1 ? i - 1 : 0), r = 1; r < i; r++)n[r - 1] = arguments[r];
        var s = K(e), o = q.call(this, s), h = void 0;
        return t.isFunction(o) && (h = o.apply(this, n)), this.trigger.apply(this, arguments), h
    }

    function s(e) {
        for (var i = arguments.length, n = Array(i > 1 ? i - 1 : 0), s = 1; s < i; s++)n[s - 1] = arguments[s];
        return t.isFunction(e.triggerMethod) ? e.triggerMethod.apply(e, n) : r.apply(e, n)
    }

    function o(e, i, n) {
        e._getImmediateChildren && t.each(e._getImmediateChildren(), function (e) {
            n(e) && s(e, i, e)
        })
    }

    function h(e) {
        return !e._isAttached
    }

    function d(e) {
        return !!h(e) && (e._isAttached = !0, !0)
    }

    function a(e) {
        return e._isAttached
    }

    function l(e) {
        return !!a(e) && (e._isAttached = !1, !0)
    }

    function c(e) {
        e._isAttached && e._isRendered && s(e, "dom:refresh", e)
    }

    function u() {
        o(this, "before:attach", h)
    }

    function f() {
        o(this, "attach", d), c(this)
    }

    function p() {
        o(this, "before:detach", a)
    }

    function g() {
        o(this, "detach", l)
    }

    function _() {
        c(this)
    }

    function v(e) {
        e._areViewEventsMonitored || (e._areViewEventsMonitored = !0, e.on({
            "before:attach": u,
            attach: f,
            "before:detach": p,
            detach: g,
            render: _
        }))
    }

    function m(e, i, n, r, s) {
        var o = r.split(/\s+/);
        t.each(o, function (t) {
            var r = e[t];
            if (!r)throw new Y('Method "' + t + '" was configured as an event handler, but does not exist.');
            e[s](i, n, r)
        })
    }

    function w(e, i, n, r) {
        if (i && n) {
            if (!t.isObject(n))throw new Y({
                message: "Bindings must be an object.",
                url: "marionette.functions.html#marionettebindevents"
            });
            t.each(n, function (n, s) {
                return t.isString(n) ? void m(e, i, s, n, r) : void e[r](i, s, n)
            })
        }
    }

    function y(e, t) {
        return w(this, e, t, "listenTo"), this
    }

    function E(e, t) {
        return w(this, e, t, "stopListening"), this
    }

    function V(e, i, n, r) {
        if (i && n) {
            if (!t.isObject(n))throw new Y({
                message: "Bindings must be an object.",
                url: "marionette.functions.html#marionettebindrequests"
            });
            var s = N.call(e, n);
            i[r](s, e)
        }
    }

    function C(e, t) {
        return V(this, e, t, "reply"), this
    }

    function b(e, t) {
        return V(this, e, t, "stopReplying"), this
    }

    function M(e) {
        if (Array.isArray(e)) {
            for (var t = 0, i = Array(e.length); t < e.length; t++)i[t] = e[t];
            return i
        }
        return Array.from(e)
    }

    function R(e, i) {
        return e.behaviorClass ? e.behaviorClass : t.isFunction(e) ? e : t.isFunction(De.Behaviors.behaviorsLookup) ? De.Behaviors.behaviorsLookup(e, i)[i] : De.Behaviors.behaviorsLookup[i]
    }

    function x(e, i) {
        return t.chain(i).map(function (i, n) {
            var r = R(i, n), s = i === r ? {} : i, o = new r(s, e), h = x(e, t.result(o, "behaviors"));
            return [o].concat(h)
        }).flatten().value()
    }

    function B(e, i) {
        return [e + t.uniqueId(".evt"), i].join(" ")
    }

    function I(e, i) {
        t.isString(i) && (i = {event: i});
        var n = i.event, r = i.preventDefault !== !1, s = i.stopPropagation !== !1;
        return function (t) {
            r && t.preventDefault(), s && t.stopPropagation(), e.triggerMethod(n, e)
        }
    }

    function A(e) {
        e.supportsDestroyLifecycle || s(e, "before:destroy", e);
        var t = !!e._isAttached;
        t && s(e, "before:detach", e), e.remove(), t && (e._isAttached = !1, s(e, "detach", e)), e._isDestroyed = !0, e.supportsDestroyLifecycle || s(e, "destroy", e)
    }

    function O(e, t) {
        return e instanceof fe ? e : T(e, t)
    }

    function T(e, i) {
        var n = t.extend({}, i);
        if (t.isString(e))return t.extend(n, {el: e}), U(n);
        if (t.isFunction(e))return t.extend(n, {regionClass: e}), U(n);
        if (t.isObject(e))return e.selector && F("The selector option on a Region definition object is deprecated. Use el to pass a selector string"), t.extend(n, {el: e.selector}, e), U(n);
        throw new Y({
            message: "Improper region configuration type.",
            url: "marionette.region.html#region-configuration-types"
        })
    }

    function U(e) {
        var i = e.regionClass, n = t.omit(e, "regionClass");
        return new i(n)
    }

    function D() {
        throw new Y({
            message: "You must define where your behaviors are stored.",
            url: "marionette.behaviors.md#behaviorslookup"
        })
    }

    function $(e) {
        return !!Te[e]
    }

    function k(e, t) {
        return Te[e] = t
    }

    e = "default" in e ? e.default : e, t = "default" in t ? t.default : t, i = "default" in i ? i.default : i;
    var S = "3.1.0", z = function (e) {
        return function (t) {
            for (var i = arguments.length, n = Array(i > 1 ? i - 1 : 0), r = 1; r < i; r++)n[r - 1] = arguments[r];
            return e.apply(t, n)
        }
    }, L = e.Model.extend, F = function e(i, n) {
        t.isObject(i) && (i = i.prev + " is going to be removed in the future. Please use " + i.next + " instead." + (i.url ? " See: " + i.url : "")), De.DEV_MODE && (void 0 !== n && n || e._cache[i] || (e._warn("Deprecation warning: " + i), e._cache[i] = !0))
    };
    F._console = "undefined" != typeof console ? console : {}, F._warn = function () {
        var e = F._console.warn || F._console.log || t.noop;
        return e.apply(F._console, arguments)
    }, F._cache = {};
    var P = function (t) {
        return e.$.contains(document.documentElement, t)
    }, j = function (e, i) {
        var n = this;
        e && t.each(i, function (t) {
            var i = e[t];
            void 0 !== i && (n[t] = i)
        })
    }, q = function (e) {
        if (e)return this.options && void 0 !== this.options[e] ? this.options[e] : this[e]
    }, N = function (e) {
        var i = this;
        return t.reduce(e, function (e, n, r) {
            return t.isFunction(n) || (n = i[n]), n && (e[r] = n), e
        }, {})
    }, H = /(^|:)(\w)/gi, K = t.memoize(function (e) {
        return "on" + e.replace(H, n)
    }), G = ["description", "fileName", "lineNumber", "name", "message", "number"], Y = L.call(Error, {
        urlRoot: "http://marionettejs.com/docs/v" + S + "/",
        constructor: function (e, i) {
            t.isObject(e) ? (i = e, e = i.message) : i || (i = {});
            var n = Error.call(this, e);
            t.extend(this, t.pick(n, G), t.pick(i, G)), this.captureStackTrace(), i.url && (this.url = this.urlRoot + i.url)
        },
        captureStackTrace: function () {
            Error.captureStackTrace && Error.captureStackTrace(this, Y)
        },
        toString: function () {
            return this.name + ": " + this.message + (this.url ? " See: " + this.url : "")
        }
    });
    Y.extend = L;
    var Z = function () {
        for (var e = arguments.length, i = Array(e), n = 0; n < e; n++)i[n] = arguments[n];
        this.options = t.extend.apply(t, [{}, t.result(this, "options")].concat(i))
    }, J = {
        normalizeMethods: N,
        _setOptions: Z,
        mergeOptions: j,
        getOption: q,
        bindEvents: y,
        unbindEvents: E
    }, Q = {
        _initRadio: function () {
            var e = t.result(this, "channelName");
            if (e) {
                if (!i)throw new Y({
                    name: "BackboneRadioMissing",
                    message: 'The dependency "backbone.radio" is missing.'
                });
                var n = this._channel = i.channel(e), r = t.result(this, "radioEvents");
                this.bindEvents(n, r);
                var s = t.result(this, "radioRequests");
                this.bindRequests(n, s), this.on("destroy", this._destroyRadio)
            }
        }, _destroyRadio: function () {
            this._channel.stopReplying(null, null, this)
        }, getChannel: function () {
            return this._channel
        }, bindEvents: y, unbindEvents: E, bindRequests: C, unbindRequests: b
    }, W = ["channelName", "radioEvents", "radioRequests"], X = function (e) {
        this._setOptions(e), this.mergeOptions(e, W), this.cid = t.uniqueId(this.cidPrefix), this._initRadio(), this.initialize.apply(this, arguments)
    };
    X.extend = L, t.extend(X.prototype, e.Events, J, Q, {
        cidPrefix: "mno", _isDestroyed: !1, isDestroyed: function () {
            return this._isDestroyed
        }, initialize: function () {
        }, destroy: function () {
            if (this._isDestroyed)return this;
            for (var e = arguments.length, t = Array(e), i = 0; i < e; i++)t[i] = arguments[i];
            return this.triggerMethod.apply(this, ["before:destroy", this].concat(t)), this._isDestroyed = !0, this.triggerMethod.apply(this, ["destroy", this].concat(t)), this.stopListening(), this
        }, triggerMethod: r
    });
    var ee = function (e) {
        this.templateId = e
    };
    t.extend(ee, {
        templateCaches: {}, get: function (e, t) {
            var i = this.templateCaches[e];
            return i || (i = new ee(e), this.templateCaches[e] = i), i.load(t)
        }, clear: function () {
            for (var e = void 0, t = arguments.length, i = Array(t), n = 0; n < t; n++)i[n] = arguments[n];
            var r = i.length;
            if (r > 0)for (e = 0; e < r; e++)delete this.templateCaches[i[e]]; else this.templateCaches = {}
        }
    }), t.extend(ee.prototype, {
        load: function (e) {
            if (this.compiledTemplate)return this.compiledTemplate;
            var t = this.loadTemplate(this.templateId, e);
            return this.compiledTemplate = this.compileTemplate(t, e), this.compiledTemplate
        }, loadTemplate: function (t, i) {
            var n = e.$(t);
            if (!n.length)throw new Y({name: "NoTemplateError", message: 'Could not find template: "' + t + '"'});
            return n.html()
        }, compileTemplate: function (e, i) {
            return t.template(e, i)
        }
    });
    var te = t.invokeMap || t.invoke, ie = {
        _initBehaviors: function () {
            var e = t.result(this, "behaviors");
            this._behaviors = t.isObject(e) ? x(this, e) : {}
        }, _getBehaviorTriggers: function () {
            var e = te(this._behaviors, "getTriggers");
            return t.extend.apply(t, [{}].concat(M(e)))
        }, _getBehaviorEvents: function () {
            var e = te(this._behaviors, "getEvents");
            return t.extend.apply(t, [{}].concat(M(e)))
        }, _proxyBehaviorViewProperties: function () {
            te(this._behaviors, "proxyViewProperties")
        }, _delegateBehaviorEntityEvents: function () {
            te(this._behaviors, "delegateEntityEvents")
        }, _undelegateBehaviorEntityEvents: function () {
            te(this._behaviors, "undelegateEntityEvents")
        }, _destroyBehaviors: function (e) {
            te.apply(void 0, [this._behaviors, "destroy"].concat(M(e)))
        }, _bindBehaviorUIElements: function () {
            te(this._behaviors, "bindUIElements")
        }, _unbindBehaviorUIElements: function () {
            te(this._behaviors, "unbindUIElements")
        }, _triggerEventOnBehaviors: function () {
            for (var e = this._behaviors, t = 0, i = e && e.length; t < i; t++)r.apply(e[t], arguments)
        }
    }, ne = {
        _delegateEntityEvents: function (e, i) {
            this._undelegateEntityEvents(e, i);
            var n = t.result(this, "modelEvents");
            y.call(this, e, n);
            var r = t.result(this, "collectionEvents");
            y.call(this, i, r)
        }, _undelegateEntityEvents: function (e, i) {
            var n = t.result(this, "modelEvents");
            E.call(this, e, n);
            var r = t.result(this, "collectionEvents");
            E.call(this, i, r)
        }
    }, re = /^(\S+)\s*(.*)$/, se = function (e) {
        var t = e.match(re);
        return B(t[1], t[2])
    }, oe = {
        _getViewTriggers: function (e, i) {
            return t.reduce(i, function (t, i, n) {
                return n = se(n), t[n] = I(e, i), t
            }, {})
        }
    }, he = function (e, i) {
        return t.reduce(e, function (e, t, n) {
            var r = de(n, i);
            return e[r] = t, e
        }, {})
    }, de = function (e, t) {
        return e.replace(/@ui\.[a-zA-Z-_$0-9]*/g, function (e) {
            return t[e.slice(4)]
        })
    }, ae = function e(i, n, r) {
        return t.each(i, function (s, o) {
            t.isString(s) ? i[o] = de(s, n) : t.isObject(s) && t.isArray(r) && (t.extend(s, e(t.pick(s, r), n)), t.each(r, function (e) {
                var i = s[e];
                t.isString(i) && (s[e] = de(i, n))
            }))
        }), i
    }, le = {
        normalizeUIKeys: function (e) {
            var t = this._getUIBindings();
            return he(e, t)
        }, normalizeUIString: function (e) {
            var t = this._getUIBindings();
            return de(e, t)
        }, normalizeUIValues: function (e, t) {
            var i = this._getUIBindings();
            return ae(e, i, t)
        }, _getUIBindings: function () {
            var e = t.result(this, "_uiBindings"), i = t.result(this, "ui");
            return e || i
        }, _bindUIElements: function () {
            var e = this;
            if (this.ui) {
                this._uiBindings || (this._uiBindings = this.ui);
                var i = t.result(this, "_uiBindings");
                this._ui = {}, t.each(i, function (t, i) {
                    e._ui[i] = e.$(t)
                }), this.ui = this._ui
            }
        }, _unbindUIElements: function () {
            var e = this;
            this.ui && this._uiBindings && (t.each(this.ui, function (t, i) {
                delete e.ui[i]
            }), this.ui = this._uiBindings, delete this._uiBindings, delete this._ui)
        }, _getUI: function (e) {
            return this._ui[e]
        }
    }, ce = {
        supportsRenderLifecycle: !0, supportsDestroyLifecycle: !0, _isDestroyed: !1, isDestroyed: function () {
            return !!this._isDestroyed
        }, _isRendered: !1, isRendered: function () {
            return !!this._isRendered
        }, _isAttached: !1, isAttached: function () {
            return !!this._isAttached
        }, delegateEvents: function (i) {
            this._proxyBehaviorViewProperties(), this._buildEventProxies();
            var n = this._getEvents(i);
            "undefined" == typeof i && (this.events = n);
            var r = t.extend({}, this._getBehaviorEvents(), n, this._getBehaviorTriggers(), this.getTriggers());
            return e.View.prototype.delegateEvents.call(this, r), this
        }, _getEvents: function (e) {
            var i = e || this.events;
            return t.isFunction(i) ? this.normalizeUIKeys(i.call(this)) : this.normalizeUIKeys(i)
        }, getTriggers: function () {
            if (this.triggers) {
                var e = this.normalizeUIKeys(t.result(this, "triggers"));
                return this._getViewTriggers(this, e)
            }
        }, delegateEntityEvents: function () {
            return this._delegateEntityEvents(this.model, this.collection), this._delegateBehaviorEntityEvents(), this
        }, undelegateEntityEvents: function () {
            return this._undelegateEntityEvents(this.model, this.collection), this._undelegateBehaviorEntityEvents(), this
        }, _ensureViewIsIntact: function () {
            if (this._isDestroyed)throw new Y({
                name: "ViewDestroyedError",
                message: 'View (cid: "' + this.cid + '") has already been destroyed and cannot be used.'
            })
        }, destroy: function () {
            if (this._isDestroyed)return this;
            for (var e = !!this._isAttached, t = arguments.length, i = Array(t), n = 0; n < t; n++)i[n] = arguments[n];
            return this.triggerMethod.apply(this, ["before:destroy", this].concat(i)), e && this.triggerMethod("before:detach", this), this.unbindUIElements(), this._removeElement(), e && (this._isAttached = !1, this.triggerMethod("detach", this)), this._removeChildren(), this._destroyBehaviors(i), this._isDestroyed = !0, this._isRendered = !1, this.triggerMethod.apply(this, ["destroy", this].concat(i)), this.stopListening(), this
        }, bindUIElements: function () {
            return this._bindUIElements(), this._bindBehaviorUIElements(), this
        }, unbindUIElements: function () {
            return this._unbindUIElements(), this._unbindBehaviorUIElements(), this
        }, getUI: function (e) {
            return this._ensureViewIsIntact(), this._getUI(e)
        }, childViewEventPrefix: "childview", triggerMethod: function () {
            var e = r.apply(this, arguments);
            return this._triggerEventOnBehaviors.apply(this, arguments), this._triggerEventOnParentLayout.apply(this, arguments), e
        }, _buildEventProxies: function () {
            this._childViewEvents = t.result(this, "childViewEvents"), this._childViewTriggers = t.result(this, "childViewTriggers")
        }, _triggerEventOnParentLayout: function () {
            var e = this._parentView();
            e && e._childViewEventHandler.apply(e, arguments)
        }, _parentView: function () {
            for (var e = this._parent; e;) {
                if (e instanceof ve)return e;
                e = e._parent
            }
        }, _childViewEventHandler: function (e) {
            for (var i = this.normalizeMethods(this._childViewEvents), n = arguments.length, r = Array(n > 1 ? n - 1 : 0), s = 1; s < n; s++)r[s - 1] = arguments[s];
            "undefined" != typeof i && t.isFunction(i[e]) && i[e].apply(this, r);
            var o = this._childViewTriggers;
            o && t.isString(o[e]) && this.triggerMethod.apply(this, [o[e]].concat(r));
            var h = t.result(this, "childViewEventPrefix");
            if (h !== !1) {
                var d = h + ":" + e;
                this.triggerMethod.apply(this, [d].concat(r))
            }
        }
    };
    t.extend(ce, ie, J, ne, oe, le);
    var ue = ["allowMissingEl", "parentEl", "replaceElement"], fe = X.extend({
        cidPrefix: "mnr",
        replaceElement: !1,
        _isReplaced: !1,
        constructor: function (t) {
            if (this._setOptions(t), this.mergeOptions(t, ue), this._initEl = this.el = this.getOption("el"), this.el = this.el instanceof e.$ ? this.el[0] : this.el, !this.el)throw new Y({
                name: "NoElError",
                message: 'An "el" must be specified for a region.'
            });
            this.$el = this.getEl(this.el), X.call(this, t)
        },
        show: function (e, t) {
            if (this._ensureElement(t))return this._ensureView(e), e === this.currentView ? this : (this.triggerMethod("before:show", this, e, t), v(e), this.empty(t), e.on("destroy", this._empty, this), e._parent = this, this._renderView(e), this._attachView(e, t), this.triggerMethod("show", this, e, t), this)
        },
        _renderView: function (e) {
            e._isRendered || (e.supportsRenderLifecycle || s(e, "before:render", e), e.render(), e.supportsRenderLifecycle || (e._isRendered = !0, s(e, "render", e)))
        },
        _attachView: function (e) {
            var i = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, n = !e._isAttached && P(this.el), r = "undefined" == typeof i.replaceElement ? !!t.result(this, "replaceElement") : !!i.replaceElement;
            n && s(e, "before:attach", e), r ? this._replaceEl(e) : this.attachHtml(e), n && (e._isAttached = !0, s(e, "attach", e)), this.currentView = e
        },
        _ensureElement: function () {
            var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
            if (t.isObject(this.el) || (this.$el = this.getEl(this.el), this.el = this.$el[0]), !this.$el || 0 === this.$el.length) {
                var i = "undefined" == typeof e.allowMissingEl ? !!t.result(this, "allowMissingEl") : !!e.allowMissingEl;
                if (i)return !1;
                throw new Y('An "el" must exist in DOM for this region ' + this.cid)
            }
            return !0
        },
        _ensureView: function (e) {
            if (!e)throw new Y({
                name: "ViewNotValid",
                message: "The view passed is undefined and therefore invalid. You must pass a view instance to show."
            });
            if (e._isDestroyed)throw new Y({
                name: "ViewDestroyedError",
                message: 'View (cid: "' + e.cid + '") has already been destroyed and cannot be used.'
            })
        },
        getEl: function (i) {
            return e.$(i, t.result(this, "parentEl"))
        },
        _replaceEl: function (e) {
            this._restoreEl();
            var t = this.el.parentNode;
            t.replaceChild(e.el, this.el), this._isReplaced = !0
        },
        _restoreEl: function () {
            if (this._isReplaced) {
                var e = this.currentView;
                if (e) {
                    var t = e.el.parentNode;
                    t && (t.replaceChild(this.el, e.el), this._isReplaced = !1)
                }
            }
        },
        isReplaced: function () {
            return !!this._isReplaced
        },
        attachHtml: function (e) {
            this.el.appendChild(e.el)
        },
        empty: function () {
            var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {allowMissingEl: !0}, t = this.currentView;
            if (!t)return this._ensureElement(e) && this.detachHtml(), this;
            var i = !e.preventDestroy;
            return i || F("The preventDestroy option is deprecated. Use Region#detachView"), this._empty(t, i), this
        },
        _empty: function (e, t) {
            e.off("destroy", this._empty, this), this.triggerMethod("before:empty", this, e), this._restoreEl(), delete this.currentView, e._isDestroyed || (this._removeView(e, t), delete e._parent), this.triggerMethod("empty", this, e)
        },
        _removeView: function (e, t) {
            return t ? void(e.destroy ? e.destroy() : A(e)) : void this._detachView(e)
        },
        detachView: function () {
            var e = this.currentView;
            if (e)return this._empty(e), e
        },
        _detachView: function (e) {
            var t = !!e._isAttached;
            t && s(e, "before:detach", e), this.detachHtml(), t && (e._isAttached = !1, s(e, "detach", e))
        },
        detachHtml: function () {
            this.$el.contents().detach()
        },
        hasView: function () {
            return !!this.currentView
        },
        reset: function (e) {
            return this.empty(e), this.$el && (this.el = this._initEl), delete this.$el, this
        },
        destroy: function (e) {
            return this.reset(e), X.prototype.destroy.apply(this, arguments)
        }
    }), pe = {
        regionClass: fe, _initRegions: function () {
            this.regions = this.regions || {}, this._regions = {}, this.addRegions(t.result(this, "regions"))
        }, _reInitRegions: function () {
            te(this._regions, "reset")
        }, addRegion: function (e, t) {
            var i = {};
            return i[e] = t, this.addRegions(i)[e]
        }, addRegions: function (e) {
            if (!t.isEmpty(e))return e = this.normalizeUIValues(e, ["selector", "el"]), this.regions = t.extend({}, this.regions, e), this._addRegions(e)
        }, _addRegions: function (e) {
            var i = this, n = {regionClass: this.regionClass, parentEl: t.partial(t.result, this, "el")};
            return t.reduce(e, function (e, t, r) {
                return e[r] = O(t, n), i._addRegion(e[r], r), e
            }, {})
        }, _addRegion: function (e, t) {
            this.triggerMethod("before:add:region", this, t, e), e._parent = this, this._regions[t] = e, this.triggerMethod("add:region", this, t, e)
        }, removeRegion: function (e) {
            var t = this._regions[e];
            return this._removeRegion(t, e), t
        }, removeRegions: function () {
            var e = this.getRegions();
            return t.each(this._regions, t.bind(this._removeRegion, this)), e
        }, _removeRegion: function (e, t) {
            this.triggerMethod("before:remove:region", this, t, e), e.destroy(), delete this.regions[t], delete this._regions[t], this.triggerMethod("remove:region", this, t, e)
        }, emptyRegions: function () {
            var e = this.getRegions();
            return te(e, "empty"), e
        }, hasRegion: function (e) {
            return !!this.getRegion(e)
        }, getRegion: function (e) {
            return this._regions[e]
        }, getRegions: function () {
            return t.clone(this._regions)
        }, showChildView: function (e, t) {
            for (var i = this.getRegion(e), n = arguments.length, r = Array(n > 2 ? n - 2 : 0), s = 2; s < n; s++)r[s - 2] = arguments[s];
            return i.show.apply(i, [t].concat(r))
        }, detachChildView: function (e) {
            return this.getRegion(e).detachView()
        }, getChildView: function (e) {
            return this.getRegion(e).currentView
        }
    }, ge = {
        render: function (e, i) {
            if (!e)throw new Y({
                name: "TemplateNotFoundError",
                message: "Cannot render the template since its false, null or undefined."
            });
            var n = t.isFunction(e) ? e : ee.get(e);
            return n(i)
        }
    }, _e = ["behaviors", "childViewEventPrefix", "childViewEvents", "childViewTriggers", "collectionEvents", "events", "modelEvents", "regionClass", "regions", "template", "templateContext", "triggers", "ui"], ve = e.View.extend({
        constructor: function (i) {
            this.render = t.bind(this.render, this), this._setOptions(i), this.mergeOptions(i, _e), v(this), this._initBehaviors(), this._initRegions();
            var n = Array.prototype.slice.call(arguments);
            n[0] = this.options, e.View.prototype.constructor.apply(this, n), this.delegateEntityEvents()
        }, serializeData: function () {
            return this.model || this.collection ? this.model ? this.serializeModel() : {items: this.serializeCollection()} : {}
        }, serializeModel: function () {
            return this.model ? t.clone(this.model.attributes) : {}
        }, serializeCollection: function () {
            return this.collection ? this.collection.map(function (e) {
                return t.clone(e.attributes)
            }) : {}
        }, setElement: function () {
            var t = !!this.el;
            return e.View.prototype.setElement.apply(this, arguments), t && (this._isRendered = !!this.$el.length, this._isAttached = P(this.el)), this._isRendered && this.bindUIElements(), this
        }, render: function () {
            return this._ensureViewIsIntact(), this.triggerMethod("before:render", this), this._isRendered && this._reInitRegions(), this._renderTemplate(), this.bindUIElements(), this._isRendered = !0, this.triggerMethod("render", this), this
        }, _renderTemplate: function () {
            var e = this.getTemplate();
            if (e !== !1) {
                var t = this.mixinTemplateContext(this.serializeData()), i = ge.render(e, t, this);
                this.attachElContent(i)
            }
        }, getTemplate: function () {
            return this.template
        }, mixinTemplateContext: function () {
            var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {}, i = t.result(this, "templateContext");
            return t.extend(e, i)
        }, attachElContent: function (e) {
            return this.$el.html(e), this
        }, _removeChildren: function () {
            this.removeRegions()
        }, _getImmediateChildren: function () {
            return t.chain(this.getRegions()).map("currentView").compact().value()
        }
    });
    t.extend(ve.prototype, ce, pe);
    var me = ["forEach", "each", "map", "find", "detect", "filter", "select", "reject", "every", "all", "some", "any", "include", "contains", "invoke", "toArray", "first", "initial", "rest", "last", "without", "isEmpty", "pluck", "reduce"], we = function (e, i) {
        t.each(me, function (n) {
            e[n] = function () {
                var e = t.values(t.result(this, i)), r = [e].concat(t.toArray(arguments));
                return t[n].apply(t, r)
            }
        })
    }, ye = function (e) {
        this._views = {}, this._indexByModel = {}, this._indexByCustom = {}, this._updateLength(), t.each(e, t.bind(this.add, this))
    };
    we(ye.prototype, "_views"), t.extend(ye.prototype, {
        add: function (e, t) {
            return this._add(e, t)._updateLength()
        }, _add: function (e, t) {
            var i = e.cid;
            return this._views[i] = e, e.model && (this._indexByModel[e.model.cid] = i), t && (this._indexByCustom[t] = i), this
        }, findByModel: function (e) {
            return this.findByModelCid(e.cid)
        }, findByModelCid: function (e) {
            var t = this._indexByModel[e];
            return this.findByCid(t)
        }, findByCustom: function (e) {
            var t = this._indexByCustom[e];
            return this.findByCid(t)
        }, findByIndex: function (e) {
            return t.values(this._views)[e]
        }, findByCid: function (e) {
            return this._views[e]
        }, remove: function (e) {
            return this._remove(e)._updateLength()
        }, _remove: function (e) {
            var i = e.cid;
            return e.model && delete this._indexByModel[e.model.cid], t.some(this._indexByCustom, t.bind(function (e, t) {
                if (e === i)return delete this._indexByCustom[t], !0
            }, this)), delete this._views[i], this
        }, _updateLength: function () {
            return this.length = t.size(this._views), this
        }
    });
    var Ee = ["behaviors", "childView", "childViewEventPrefix", "childViewEvents", "childViewOptions", "childViewTriggers", "collectionEvents", "events", "filter", "emptyView", "emptyViewOptions", "modelEvents", "reorderOnSort", "sort", "triggers", "ui", "viewComparator"], Ve = e.View.extend({
        sort: !0,
        constructor: function (i) {
            this.render = t.bind(this.render, this), this._setOptions(i), this.mergeOptions(i, Ee), v(this), this._initBehaviors(), this.once("render", this._initialEvents), this._initChildViewStorage(), this._bufferedChildren = [];
            var n = Array.prototype.slice.call(arguments);
            n[0] = this.options, e.View.prototype.constructor.apply(this, n), this.delegateEntityEvents()
        },
        _startBuffering: function () {
            this._isBuffering = !0
        },
        _endBuffering: function () {
            var e = !!this._isAttached, i = e ? this._getImmediateChildren() : [];
            this._isBuffering = !1, t.each(i, function (e) {
                s(e, "before:attach", e)
            }), this.attachBuffer(this, this._createBuffer()), t.each(i, function (e) {
                e._isAttached = !0, s(e, "attach", e)
            }), this._bufferedChildren = []
        },
        _getImmediateChildren: function () {
            return t.values(this.children._views)
        },
        _initialEvents: function () {
            this.collection && (this.listenTo(this.collection, "add", this._onCollectionAdd), this.listenTo(this.collection, "update", this._onCollectionUpdate), this.listenTo(this.collection, "reset", this.render), this.sort && this.listenTo(this.collection, "sort", this._sortViews))
        },
        _onCollectionAdd: function (e, i, n) {
            var r = void 0 !== n.at && (n.index || i.indexOf(e));
            (this.filter || r === !1) && (r = t.indexOf(this._filteredSortedModels(r), e)), this._shouldAddChild(e, r) && (this._destroyEmptyView(), this._addChild(e, r))
        },
        _onCollectionUpdate: function (e, t) {
            var i = t.changes;
            this._removeChildModels(i.removed)
        },
        _removeChildModels: function (e) {
            var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, i = t.checkEmpty, n = i !== !1, r = this._getRemovedViews(e);
            r.length && (this.children._updateLength(), this._updateIndices(r, !1), n && this._checkEmpty())
        },
        _getRemovedViews: function (e) {
            var i = this;
            return t.reduce(e, function (e, t) {
                var n = i.children.findByModel(t);
                return !n || n._isDestroyed ? e : (i._removeChildView(n), e.push(n), e)
            }, [])
        },
        _findGreatestIndexedView: function (e) {
            return t.reduce(e, function (e, t) {
                return !e || e._index < t._index ? t : e
            }, void 0)
        },
        _removeChildView: function (e) {
            this.triggerMethod("before:remove:child", this, e), this.children._remove(e), e.destroy ? e.destroy() : A(e), delete e._parent, this.stopListening(e), this.triggerMethod("remove:child", this, e)
        },
        setElement: function () {
            var t = !!this.el;
            return e.View.prototype.setElement.apply(this, arguments), t && (this._isAttached = P(this.el)), this
        },
        render: function () {
            return this._ensureViewIsIntact(), this.triggerMethod("before:render", this), this._renderChildren(), this._isRendered = !0, this.triggerMethod("render", this), this
        },
        setFilter: function (e) {
            var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, i = t.preventRender, n = this._isRendered && !this._isDestroyed, r = this.filter !== e, s = n && r && !i;
            if (s) {
                var o = this._filteredSortedModels();
                this.filter = e;
                var h = this._filteredSortedModels();
                this._applyModelDeltas(h, o)
            } else this.filter = e;
            return this
        },
        removeFilter: function (e) {
            return this.setFilter(null, e)
        },
        _applyModelDeltas: function (e, i) {
            var n = this, r = {};
            t.each(e, function (e, t) {
                var i = !n.children.findByModel(e);
                i && n._onCollectionAdd(e, n.collection, {at: t}), r[e.cid] = !0
            });
            var s = t.filter(i, function (e) {
                return !r[e.cid] && n.children.findByModel(e)
            });
            this._removeChildModels(s)
        },
        reorder: function () {
            var e = this, i = this.children, n = this._filteredSortedModels();
            if (!n.length && this._showingEmptyView)return this;
            var r = t.some(n, function (e) {
                return !i.findByModel(e)
            });
            return r ? this.render() : !function () {
                var r = [], s = i.reduce(function (e, i) {
                    var s = t.indexOf(n, i.model);
                    return s === -1 ? (r.push(i.model), e) : (i._index = s, e[s] = i.el, e)
                }, new Array(n.length));
                e.triggerMethod("before:reorder", e), e._appendReorderedChildren(s), e._removeChildModels(r), e.triggerMethod("reorder", e)
            }(), this
        },
        resortView: function () {
            return this.reorderOnSort ? this.reorder() : this._renderChildren(), this
        },
        _sortViews: function () {
            var e = this, i = this._filteredSortedModels(), n = t.find(i, function (t, i) {
                var n = e.children.findByModel(t);
                return !n || n._index !== i
            });
            n && this.resortView()
        },
        _emptyViewIndex: -1,
        _appendReorderedChildren: function (e) {
            this.$el.append(e)
        },
        _renderChildren: function () {
            this._isRendered && (this._destroyEmptyView(), this._destroyChildren({checkEmpty: !1}));
            var e = this._filteredSortedModels();
            this.isEmpty({processedModels: e}) ? this._showEmptyView() : (this.triggerMethod("before:render:children", this), this._startBuffering(), this._showCollection(e), this._endBuffering(), this.triggerMethod("render:children", this))
        },
        _createView: function (e, t) {
            var i = this._getChildView(e), n = this._getChildViewOptions(e, t), r = this.buildChildView(e, i, n);
            return r
        },
        _setupChildView: function (e, t) {
            e._parent = this, v(e), this._proxyChildEvents(e), this.sort && (e._index = t)
        },
        _showCollection: function (e) {
            t.each(e, t.bind(this._addChild, this)), this.children._updateLength()
        },
        _filteredSortedModels: function (e) {
            if (!this.collection || !this.collection.length)return [];
            var t = this.getViewComparator(), i = this.collection.models;
            if (e = Math.min(Math.max(e, 0), i.length - 1), t) {
                var n = void 0;
                e && (n = i[e], i = i.slice(0, e).concat(i.slice(e + 1))), i = this._sortModelsBy(i, t), n && i.splice(e, 0, n)
            }
            return i = this._filterModels(i)
        },
        getViewComparator: function () {
            return this.viewComparator
        },
        _filterModels: function (e) {
            var i = this;
            return this.filter && (e = t.filter(e, function (e, t) {
                return i._shouldAddChild(e, t)
            })), e
        },
        _sortModelsBy: function (e, i) {
            return "string" == typeof i ? t.sortBy(e, function (e) {
                return e.get(i)
            }) : 1 === i.length ? t.sortBy(e, t.bind(i, this)) : e.sort(t.bind(i, this))
        },
        _showEmptyView: function () {
            var i = this._getEmptyView();
            if (i && !this._showingEmptyView) {
                this._showingEmptyView = !0;
                var n = new e.Model, r = this.emptyViewOptions || this.childViewOptions;
                t.isFunction(r) && (r = r.call(this, n, this._emptyViewIndex));
                var s = this.buildChildView(n, i, r);
                this.triggerMethod("before:render:empty", this, s), this.addChildView(s, 0), this.triggerMethod("render:empty", this, s)
            }
        },
        _destroyEmptyView: function () {
            this._showingEmptyView && (this.triggerMethod("before:remove:empty", this), this._destroyChildren(), delete this._showingEmptyView, this.triggerMethod("remove:empty", this))
        },
        _getEmptyView: function () {
            var e = this.emptyView;
            if (e)return this._getView(e)
        },
        _getChildView: function (e) {
            var t = this.childView;
            if (!t)throw new Y({name: "NoChildViewError", message: 'A "childView" must be specified'});
            if (t = this._getView(t, e), !t)throw new Y({
                name: "InvalidChildViewError",
                message: '"childView" must be a view class or a function that returns a view class'
            });
            return t
        },
        _getView: function (i, n) {
            return i.prototype instanceof e.View || i === e.View ? i : t.isFunction(i) ? i.call(this, n) : void 0
        },
        _addChild: function (e, t) {
            var i = this._createView(e, t);
            return this.addChildView(i, t), i
        },
        _getChildViewOptions: function (e, i) {
            return t.isFunction(this.childViewOptions) ? this.childViewOptions(e, i) : this.childViewOptions
        },
        addChildView: function (e, t) {
            return this.triggerMethod("before:add:child", this, e), this._setupChildView(e, t), this._isBuffering ? this.children._add(e) : (this._updateIndices(e, !0), this.children.add(e)), this._renderView(e), this._attachView(e, t), this.triggerMethod("add:child", this, e), e
        },
        _updateIndices: function (e, i) {
            if (this.sort) {
                var n = t.isArray(e) ? this._findGreatestIndexedView(e) : e;
                this.children.each(function (e) {
                    e._index >= n._index && (e._index += i ? 1 : -1)
                })
            }
        },
        _renderView: function (e) {
            e._isRendered || (e.supportsRenderLifecycle || s(e, "before:render", e), e.render(), e.supportsRenderLifecycle || (e._isRendered = !0, s(e, "render", e)))
        },
        _attachView: function (e, t) {
            var i = !e._isAttached && !this._isBuffering && this._isAttached;
            i && s(e, "before:attach", e), this.attachHtml(this, e, t), i && (e._isAttached = !0, s(e, "attach", e))
        },
        buildChildView: function (e, i, n) {
            var r = t.extend({model: e}, n);
            return new i(r)
        },
        removeChildView: function (e) {
            return !e || e._isDestroyed ? e : (this._removeChildView(e), this.children._updateLength(), this._updateIndices(e, !1), e)
        },
        isEmpty: function (e) {
            var i = void 0;
            return t.result(e, "processedModels") ? i = e.processedModels : (i = this.collection ? this.collection.models : [], i = this._filterModels(i)), 0 === i.length
        },
        _checkEmpty: function () {
            this.isEmpty() && this._showEmptyView()
        },
        attachBuffer: function (e, t) {
            e.$el.append(t)
        },
        _createBuffer: function () {
            var e = document.createDocumentFragment();
            return t.each(this._bufferedChildren, function (t) {
                e.appendChild(t.el)
            }), e
        },
        attachHtml: function (e, t, i) {
            e._isBuffering ? e._bufferedChildren.splice(i, 0, t) : e._insertBefore(t, i) || e._insertAfter(t)
        },
        _insertBefore: function (e, t) {
            var i = void 0, n = this.sort && t < this.children.length - 1;
            return n && (i = this.children.find(function (e) {
                return e._index === t + 1
            })), !!i && (i.$el.before(e.el), !0)
        },
        _insertAfter: function (e) {
            this.$el.append(e.el)
        },
        _initChildViewStorage: function () {
            this.children = new ye
        },
        _removeChildren: function () {
            this._destroyChildren({checkEmpty: !1})
        },
        _destroyChildren: function (e) {
            if (this.children.length) {
                this.triggerMethod("before:destroy:children", this);
                var t = this.children.map("model");
                this._removeChildModels(t, e), this.triggerMethod("destroy:children", this)
            }
        },
        _shouldAddChild: function (e, i) {
            var n = this.filter;
            return !t.isFunction(n) || n.call(this, e, i, this.collection)
        },
        _proxyChildEvents: function (e) {
            this.listenTo(e, "all", this._childViewEventHandler)
        }
    });
    t.extend(Ve.prototype, ce);
    var Ce = ["childViewContainer", "template", "templateContext"], be = Ve.extend({
        constructor: function (e) {
            F("CompositeView is deprecated. Convert to View at your earliest convenience"), this.mergeOptions(e, Ce), Ve.prototype.constructor.apply(this, arguments)
        }, _initialEvents: function () {
            this.collection && (this.listenTo(this.collection, "add", this._onCollectionAdd), this.listenTo(this.collection, "update", this._onCollectionUpdate), this.listenTo(this.collection, "reset", this.renderChildren), this.sort && this.listenTo(this.collection, "sort", this._sortViews))
        }, _getChildView: function (e) {
            var t = this.childView;
            if (!t)return this.constructor;
            if (t = this._getView(t, e), !t)throw new Y({
                name: "InvalidChildViewError",
                message: '"childView" must be a view class or a function that returns a view class'
            });
            return t
        }, serializeData: function () {
            return this.serializeModel()
        }, render: function () {
            return this._ensureViewIsIntact(), this._isRendering = !0,
                this.resetChildViewContainer(), this.triggerMethod("before:render", this), this._renderTemplate(), this.bindUIElements(), this.renderChildren(), this._isRendering = !1, this._isRendered = !0, this.triggerMethod("render", this), this
        }, renderChildren: function () {
            (this._isRendered || this._isRendering) && Ve.prototype._renderChildren.call(this)
        }, attachBuffer: function (e, t) {
            var i = this.getChildViewContainer(e);
            i.append(t)
        }, _insertAfter: function (e) {
            var t = this.getChildViewContainer(this, e);
            t.append(e.el)
        }, _appendReorderedChildren: function (e) {
            var t = this.getChildViewContainer(this);
            t.append(e)
        }, getChildViewContainer: function (e, i) {
            if (e.$childViewContainer)return e.$childViewContainer;
            var n = void 0, r = e.childViewContainer;
            if (r) {
                var s = t.result(e, "childViewContainer");
                if (n = "@" === s.charAt(0) && e.ui ? e.ui[s.substr(4)] : e.$(s), n.length <= 0)throw new Y({
                    name: "ChildViewContainerMissingError",
                    message: 'The specified "childViewContainer" was not found: ' + e.childViewContainer
                })
            } else n = e.$el;
            return e.$childViewContainer = n, n
        }, resetChildViewContainer: function () {
            this.$childViewContainer && (this.$childViewContainer = void 0)
        }
    }), Me = t.pick(ve.prototype, "serializeModel", "getTemplate", "_renderTemplate", "mixinTemplateContext", "attachElContent");
    t.extend(be.prototype, Me);
    var Re = ["collectionEvents", "events", "modelEvents", "triggers", "ui"], xe = X.extend({
        cidPrefix: "mnb",
        constructor: function (e, i) {
            this.view = i, this.defaults = t.clone(t.result(this, "defaults", {})), this._setOptions(this.defaults, e), this.mergeOptions(this.options, Re), this.ui = t.extend({}, t.result(this, "ui"), t.result(i, "ui")), X.apply(this, arguments)
        },
        $: function () {
            return this.view.$.apply(this.view, arguments)
        },
        destroy: function () {
            return this.stopListening(), this
        },
        proxyViewProperties: function () {
            return this.$el = this.view.$el, this.el = this.view.el, this
        },
        bindUIElements: function () {
            return this._bindUIElements(), this
        },
        unbindUIElements: function () {
            return this._unbindUIElements(), this
        },
        getUI: function (e) {
            return this.view._ensureViewIsIntact(), this._getUI(e)
        },
        delegateEntityEvents: function () {
            return this._delegateEntityEvents(this.view.model, this.view.collection), this
        },
        undelegateEntityEvents: function () {
            return this._undelegateEntityEvents(this.view.model, this.view.collection), this
        },
        getEvents: function () {
            var e = this, i = this.normalizeUIKeys(t.result(this, "events"));
            return t.reduce(i, function (i, n, r) {
                if (t.isFunction(n) || (n = e[n]), n)return r = se(r), i[r] = t.bind(n, e), i
            }, {})
        },
        getTriggers: function () {
            if (this.triggers) {
                var e = this.normalizeUIKeys(t.result(this, "triggers"));
                return this._getViewTriggers(this.view, e)
            }
        }
    });
    t.extend(xe.prototype, ne, oe, le);
    var Be = ["region", "regionClass"], Ie = X.extend({
        cidPrefix: "mna", constructor: function (e) {
            this._setOptions(e), this.mergeOptions(e, Be), this._initRegion(), X.prototype.constructor.apply(this, arguments)
        }, regionClass: fe, _initRegion: function () {
            var e = this.region;
            if (e) {
                var t = {regionClass: this.regionClass};
                this._region = O(e, t)
            }
        }, getRegion: function () {
            return this._region
        }, showView: function (e) {
            for (var t = this.getRegion(), i = arguments.length, n = Array(i > 1 ? i - 1 : 0), r = 1; r < i; r++)n[r - 1] = arguments[r];
            return t.show.apply(t, [e].concat(n))
        }, getView: function () {
            return this.getRegion().currentView
        }, start: function (e) {
            return this.triggerMethod("before:start", this, e), this.triggerMethod("start", this, e), this
        }
    }), Ae = ["appRoutes", "controller"], Oe = e.Router.extend({
        constructor: function (t) {
            this._setOptions(t), this.mergeOptions(t, Ae), e.Router.apply(this, arguments);
            var i = this.appRoutes, n = this._getController();
            this.processAppRoutes(n, i), this.on("route", this._processOnRoute, this)
        }, appRoute: function (e, t) {
            var i = this._getController();
            return this._addAppRoute(i, e, t), this
        }, _processOnRoute: function (e, i) {
            if (t.isFunction(this.onRoute)) {
                var n = t.invert(this.appRoutes)[e];
                this.onRoute(e, n, i)
            }
        }, processAppRoutes: function (e, i) {
            var n = this;
            if (!i)return this;
            var r = t.keys(i).reverse();
            return t.each(r, function (t) {
                n._addAppRoute(e, t, i[t])
            }), this
        }, _getController: function () {
            return this.controller
        }, _addAppRoute: function (e, i, n) {
            var r = e[n];
            if (!r)throw new Y('Method "' + n + '" was not found on the controller');
            this.route(i, n, t.bind(r, e))
        }, triggerMethod: r
    });
    t.extend(Oe.prototype, J);
    var Te = {}, Ue = e.Marionette, De = e.Marionette = {};
    return De.noConflict = function () {
        return e.Marionette = Ue, this
    }, De.bindEvents = z(y), De.unbindEvents = z(E), De.bindRequests = z(C), De.unbindRequests = z(b), De.mergeOptions = z(j), De.getOption = z(q), De.normalizeMethods = z(N), De.extend = L, De.isNodeAttached = P, De.deprecate = F, De.triggerMethod = z(r), De.triggerMethodOn = s, De.isEnabled = $, De.setEnabled = k, De.monitorViewEvents = v, De.Behaviors = {}, De.Behaviors.behaviorsLookup = D, De.Application = Ie, De.AppRouter = Oe, De.Renderer = ge, De.TemplateCache = ee, De.View = ve, De.CollectionView = Ve, De.CompositeView = be, De.Behavior = xe, De.Region = fe, De.Error = Y, De.Object = X, De.DEV_MODE = !1, De.FEATURES = Te, De.VERSION = S, De
});
//# sourceMappingURL=backbone.marionette.min.js.map
;
define('AppRouter',['require','exports','module','marionette'],function (require, exports, module) {/**
 * Created by dmitry on 19.08.16.
 */


var Marionette = require('marionette');

module.exports = Marionette.AppRouter.extend({
    initialize: function(options){
        //set controller to this.controller
        _.extend(this, options);
    },

    //set corresponddence between routes and controller's methods
    appRoutes: {
        "": "animals",
        "animals": "animals",
        "login": "login",
        "admin": "admin"
    }
});

});

/*!

 handlebars v3.0.3

 Copyright (C) 2011-2014 by Yehuda Katz

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.

 @license
 */
(function webpackUniversalModuleDefinition(root, factory) {
  if(typeof exports === 'object' && typeof module === 'object')
    module.exports = factory();
  else if(typeof define === 'function' && define.amd)
    define('hbs/handlebars',factory);
  else if(typeof exports === 'object')
    exports["Handlebars"] = factory();
  else
    root["Handlebars"] = factory();
})(this, function() {
  return /******/ (function(modules) { // webpackBootstrap
    /******/ 	// The module cache
    /******/ 	var installedModules = {};

    /******/ 	// The require function
    /******/ 	function __webpack_require__(moduleId) {

      /******/ 		// Check if module is in cache
      /******/ 		if(installedModules[moduleId])
      /******/ 			return installedModules[moduleId].exports;

      /******/ 		// Create a new module (and put it into the cache)
      /******/ 		var module = installedModules[moduleId] = {
        /******/ 			exports: {},
        /******/ 			id: moduleId,
        /******/ 			loaded: false
        /******/ 		};

      /******/ 		// Execute the module function
      /******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

      /******/ 		// Flag the module as loaded
      /******/ 		module.loaded = true;

      /******/ 		// Return the exports of the module
      /******/ 		return module.exports;
      /******/ 	}


    /******/ 	// expose the modules object (__webpack_modules__)
    /******/ 	__webpack_require__.m = modules;

    /******/ 	// expose the module cache
    /******/ 	__webpack_require__.c = installedModules;

    /******/ 	// __webpack_public_path__
    /******/ 	__webpack_require__.p = "";

    /******/ 	// Load entry module and return exports
    /******/ 	return __webpack_require__(0);
    /******/ })
    /************************************************************************/
    /******/ ([
    /* 0 */
    /***/ function(module, exports, __webpack_require__) {

      'use strict';

      var _interopRequireDefault = __webpack_require__(8)['default'];

      exports.__esModule = true;

      var _runtime = __webpack_require__(1);

      var _runtime2 = _interopRequireDefault(_runtime);

      // Compiler imports

      var _AST = __webpack_require__(2);

      var _AST2 = _interopRequireDefault(_AST);

      var _Parser$parse = __webpack_require__(3);

      var _Compiler$compile$precompile = __webpack_require__(4);

      var _JavaScriptCompiler = __webpack_require__(5);

      var _JavaScriptCompiler2 = _interopRequireDefault(_JavaScriptCompiler);

      var _Visitor = __webpack_require__(6);

      var _Visitor2 = _interopRequireDefault(_Visitor);

      var _noConflict = __webpack_require__(7);

      var _noConflict2 = _interopRequireDefault(_noConflict);

      var _create = _runtime2['default'].create;
      function create() {
        var hb = _create();

        hb.compile = function (input, options) {
          return _Compiler$compile$precompile.compile(input, options, hb);
        };
        hb.precompile = function (input, options) {
          return _Compiler$compile$precompile.precompile(input, options, hb);
        };

        hb.AST = _AST2['default'];
        hb.Compiler = _Compiler$compile$precompile.Compiler;
        hb.JavaScriptCompiler = _JavaScriptCompiler2['default'];
        hb.Parser = _Parser$parse.parser;
        hb.parse = _Parser$parse.parse;

        return hb;
      }

      var inst = create();
      inst.create = create;

      _noConflict2['default'](inst);

      inst.Visitor = _Visitor2['default'];

      inst['default'] = inst;

      exports['default'] = inst;
      module.exports = exports['default'];

      /***/ },
    /* 1 */
    /***/ function(module, exports, __webpack_require__) {

      'use strict';

      var _interopRequireWildcard = __webpack_require__(9)['default'];

      var _interopRequireDefault = __webpack_require__(8)['default'];

      exports.__esModule = true;

      var _import = __webpack_require__(10);

      var base = _interopRequireWildcard(_import);

      // Each of these augment the Handlebars object. No need to setup here.
      // (This is done to easily share code between commonjs and browse envs)

      var _SafeString = __webpack_require__(11);

      var _SafeString2 = _interopRequireDefault(_SafeString);

      var _Exception = __webpack_require__(12);

      var _Exception2 = _interopRequireDefault(_Exception);

      var _import2 = __webpack_require__(13);

      var Utils = _interopRequireWildcard(_import2);

      var _import3 = __webpack_require__(14);

      var runtime = _interopRequireWildcard(_import3);

      var _noConflict = __webpack_require__(7);

      var _noConflict2 = _interopRequireDefault(_noConflict);

      // For compatibility and usage outside of module systems, make the Handlebars object a namespace
      function create() {
        var hb = new base.HandlebarsEnvironment();

        Utils.extend(hb, base);
        hb.SafeString = _SafeString2['default'];
        hb.Exception = _Exception2['default'];
        hb.Utils = Utils;
        hb.escapeExpression = Utils.escapeExpression;

        hb.VM = runtime;
        hb.template = function (spec) {
          return runtime.template(spec, hb);
        };

        return hb;
      }

      var inst = create();
      inst.create = create;

      _noConflict2['default'](inst);

      inst['default'] = inst;

      exports['default'] = inst;
      module.exports = exports['default'];

      /***/ },
    /* 2 */
    /***/ function(module, exports, __webpack_require__) {

      'use strict';

      exports.__esModule = true;
      var AST = {
        Program: function Program(statements, blockParams, strip, locInfo) {
          this.loc = locInfo;
          this.type = 'Program';
          this.body = statements;

          this.blockParams = blockParams;
          this.strip = strip;
        },

        MustacheStatement: function MustacheStatement(path, params, hash, escaped, strip, locInfo) {
          this.loc = locInfo;
          this.type = 'MustacheStatement';

          this.path = path;
          this.params = params || [];
          this.hash = hash;
          this.escaped = escaped;

          this.strip = strip;
        },

        BlockStatement: function BlockStatement(path, params, hash, program, inverse, openStrip, inverseStrip, closeStrip, locInfo) {
          this.loc = locInfo;
          this.type = 'BlockStatement';

          this.path = path;
          this.params = params || [];
          this.hash = hash;
          this.program = program;
          this.inverse = inverse;

          this.openStrip = openStrip;
          this.inverseStrip = inverseStrip;
          this.closeStrip = closeStrip;
        },

        PartialStatement: function PartialStatement(name, params, hash, strip, locInfo) {
          this.loc = locInfo;
          this.type = 'PartialStatement';

          this.name = name;
          this.params = params || [];
          this.hash = hash;

          this.indent = '';
          this.strip = strip;
        },

        ContentStatement: function ContentStatement(string, locInfo) {
          this.loc = locInfo;
          this.type = 'ContentStatement';
          this.original = this.value = string;
        },

        CommentStatement: function CommentStatement(comment, strip, locInfo) {
          this.loc = locInfo;
          this.type = 'CommentStatement';
          this.value = comment;

          this.strip = strip;
        },

        SubExpression: function SubExpression(path, params, hash, locInfo) {
          this.loc = locInfo;

          this.type = 'SubExpression';
          this.path = path;
          this.params = params || [];
          this.hash = hash;
        },

        PathExpression: function PathExpression(data, depth, parts, original, locInfo) {
          this.loc = locInfo;
          this.type = 'PathExpression';

          this.data = data;
          this.original = original;
          this.parts = parts;
          this.depth = depth;
        },

        StringLiteral: function StringLiteral(string, locInfo) {
          this.loc = locInfo;
          this.type = 'StringLiteral';
          this.original = this.value = string;
        },

        NumberLiteral: function NumberLiteral(number, locInfo) {
          this.loc = locInfo;
          this.type = 'NumberLiteral';
          this.original = this.value = Number(number);
        },

        BooleanLiteral: function BooleanLiteral(bool, locInfo) {
          this.loc = locInfo;
          this.type = 'BooleanLiteral';
          this.original = this.value = bool === 'true';
        },

        UndefinedLiteral: function UndefinedLiteral(locInfo) {
          this.loc = locInfo;
          this.type = 'UndefinedLiteral';
          this.original = this.value = undefined;
        },

        NullLiteral: function NullLiteral(locInfo) {
          this.loc = locInfo;
          this.type = 'NullLiteral';
          this.original = this.value = null;
        },

        Hash: function Hash(pairs, locInfo) {
          this.loc = locInfo;
          this.type = 'Hash';
          this.pairs = pairs;
        },
        HashPair: function HashPair(key, value, locInfo) {
          this.loc = locInfo;
          this.type = 'HashPair';
          this.key = key;
          this.value = value;
        },

        // Public API used to evaluate derived attributes regarding AST nodes
        helpers: {
          // a mustache is definitely a helper if:
          // * it is an eligible helper, and
          // * it has at least one parameter or hash segment
          helperExpression: function helperExpression(node) {
            return !!(node.type === 'SubExpression' ||  node.params.length || node.hash);
          },

          scopedId: function scopedId(path) {
            return /^\.|this\b/.test(path.original);
          },

          // an ID is simple if it only has one part, and that part is not
          // `..` or `this`.
          simpleId: function simpleId(path) {
            return path.parts.length === 1 && !AST.helpers.scopedId(path) && !path.depth;
          }
        }
      };

      // Must be exported as an object rather than the root of the module as the jison lexer
      // must modify the object to operate properly.
      exports['default'] = AST;
      module.exports = exports['default'];

      /***/ },
    /* 3 */
    /***/ function(module, exports, __webpack_require__) {

      'use strict';

      var _interopRequireDefault = __webpack_require__(8)['default'];

      var _interopRequireWildcard = __webpack_require__(9)['default'];

      exports.__esModule = true;
      exports.parse = parse;

      var _parser = __webpack_require__(15);

      var _parser2 = _interopRequireDefault(_parser);

      var _AST = __webpack_require__(2);

      var _AST2 = _interopRequireDefault(_AST);

      var _WhitespaceControl = __webpack_require__(16);

      var _WhitespaceControl2 = _interopRequireDefault(_WhitespaceControl);

      var _import = __webpack_require__(17);

      var Helpers = _interopRequireWildcard(_import);

      var _extend = __webpack_require__(13);

      exports.parser = _parser2['default'];

      var yy = {};
      _extend.extend(yy, Helpers, _AST2['default']);

      function parse(input, options) {
        // Just return if an already-compiled AST was passed in.
        if (input.type === 'Program') {
          return input;
        }

        _parser2['default'].yy = yy;

        // Altering the shared object here, but this is ok as parser is a sync operation
        yy.locInfo = function (locInfo) {
          return new yy.SourceLocation(options && options.srcName, locInfo);
        };

        var strip = new _WhitespaceControl2['default']();
        return strip.accept(_parser2['default'].parse(input));
      }

      /***/ },
    /* 4 */
    /***/ function(module, exports, __webpack_require__) {

      'use strict';

      var _interopRequireDefault = __webpack_require__(8)['default'];

      exports.__esModule = true;
      exports.Compiler = Compiler;
      exports.precompile = precompile;
      exports.compile = compile;

      var _Exception = __webpack_require__(12);

      var _Exception2 = _interopRequireDefault(_Exception);

      var _isArray$indexOf = __webpack_require__(13);

      var _AST = __webpack_require__(2);

      var _AST2 = _interopRequireDefault(_AST);

      var slice = [].slice;

      function Compiler() {}

      // the foundHelper register will disambiguate helper lookup from finding a
      // function in a context. This is necessary for mustache compatibility, which
      // requires that context functions in blocks are evaluated by blockHelperMissing,
      // and then proceed as if the resulting value was provided to blockHelperMissing.

      Compiler.prototype = {
        compiler: Compiler,

        equals: function equals(other) {
          var len = this.opcodes.length;
          if (other.opcodes.length !== len) {
            return false;
          }

          for (var i = 0; i < len; i++) {
            var opcode = this.opcodes[i],
                otherOpcode = other.opcodes[i];
            if (opcode.opcode !== otherOpcode.opcode || !argEquals(opcode.args, otherOpcode.args)) {
              return false;
            }
          }

          // We know that length is the same between the two arrays because they are directly tied
          // to the opcode behavior above.
          len = this.children.length;
          for (var i = 0; i < len; i++) {
            if (!this.children[i].equals(other.children[i])) {
              return false;
            }
          }

          return true;
        },

        guid: 0,

        compile: function compile(program, options) {
          this.sourceNode = [];
          this.opcodes = [];
          this.children = [];
          this.options = options;
          this.stringParams = options.stringParams;
          this.trackIds = options.trackIds;

          options.blockParams = options.blockParams || [];

          // These changes will propagate to the other compiler components
          var knownHelpers = options.knownHelpers;
          options.knownHelpers = {
            helperMissing: true,
            blockHelperMissing: true,
            each: true,
            'if': true,
            unless: true,
            'with': true,
            log: true,
            lookup: true
          };
          if (knownHelpers) {
            for (var _name in knownHelpers) {
              if (_name in knownHelpers) {
                options.knownHelpers[_name] = knownHelpers[_name];
              }
            }
          }

          return this.accept(program);
        },

        compileProgram: function compileProgram(program) {
          var childCompiler = new this.compiler(),
          // eslint-disable-line new-cap
              result = childCompiler.compile(program, this.options),
              guid = this.guid++;

          this.usePartial = this.usePartial || result.usePartial;

          this.children[guid] = result;
          this.useDepths = this.useDepths || result.useDepths;

          return guid;
        },

        accept: function accept(node) {
          this.sourceNode.unshift(node);
          var ret = this[node.type](node);
          this.sourceNode.shift();
          return ret;
        },

        Program: function Program(program) {
          this.options.blockParams.unshift(program.blockParams);

          var body = program.body,
              bodyLength = body.length;
          for (var i = 0; i < bodyLength; i++) {
            this.accept(body[i]);
          }

          this.options.blockParams.shift();

          this.isSimple = bodyLength === 1;
          this.blockParams = program.blockParams ? program.blockParams.length : 0;

          return this;
        },

        BlockStatement: function BlockStatement(block) {
          transformLiteralToPath(block);

          var program = block.program,
              inverse = block.inverse;

          program = program && this.compileProgram(program);
          inverse = inverse && this.compileProgram(inverse);

          var type = this.classifySexpr(block);

          if (type === 'helper') {
            this.helperSexpr(block, program, inverse);
          } else if (type === 'simple') {
            this.simpleSexpr(block);

            // now that the simple mustache is resolved, we need to
            // evaluate it by executing `blockHelperMissing`
            this.opcode('pushProgram', program);
            this.opcode('pushProgram', inverse);
            this.opcode('emptyHash');
            this.opcode('blockValue', block.path.original);
          } else {
            this.ambiguousSexpr(block, program, inverse);

            // now that the simple mustache is resolved, we need to
            // evaluate it by executing `blockHelperMissing`
            this.opcode('pushProgram', program);
            this.opcode('pushProgram', inverse);
            this.opcode('emptyHash');
            this.opcode('ambiguousBlockValue');
          }

          this.opcode('append');
        },

        PartialStatement: function PartialStatement(partial) {
          this.usePartial = true;

          var params = partial.params;
          if (params.length > 1) {
            throw new _Exception2['default']('Unsupported number of partial arguments: ' + params.length, partial);
          } else if (!params.length) {
            params.push({ type: 'PathExpression', parts: [], depth: 0 });
          }

          var partialName = partial.name.original,
              isDynamic = partial.name.type === 'SubExpression';
          if (isDynamic) {
            this.accept(partial.name);
          }

          this.setupFullMustacheParams(partial, undefined, undefined, true);

          var indent = partial.indent || '';
          if (this.options.preventIndent && indent) {
            this.opcode('appendContent', indent);
            indent = '';
          }

          this.opcode('invokePartial', isDynamic, partialName, indent);
          this.opcode('append');
        },

        MustacheStatement: function MustacheStatement(mustache) {
          this.SubExpression(mustache); // eslint-disable-line new-cap

          if (mustache.escaped && !this.options.noEscape) {
            this.opcode('appendEscaped');
          } else {
            this.opcode('append');
          }
        },

        ContentStatement: function ContentStatement(content) {
          if (content.value) {
            this.opcode('appendContent', content.value);
          }
        },

        CommentStatement: function CommentStatement() {},

        SubExpression: function SubExpression(sexpr) {
          transformLiteralToPath(sexpr);
          var type = this.classifySexpr(sexpr);

          if (type === 'simple') {
            this.simpleSexpr(sexpr);
          } else if (type === 'helper') {
            this.helperSexpr(sexpr);
          } else {
            this.ambiguousSexpr(sexpr);
          }
        },
        ambiguousSexpr: function ambiguousSexpr(sexpr, program, inverse) {
          var path = sexpr.path,
              name = path.parts[0],
              isBlock = program != null || inverse != null;

          this.opcode('getContext', path.depth);

          this.opcode('pushProgram', program);
          this.opcode('pushProgram', inverse);

          this.accept(path);

          this.opcode('invokeAmbiguous', name, isBlock);
        },

        simpleSexpr: function simpleSexpr(sexpr) {
          this.accept(sexpr.path);
          this.opcode('resolvePossibleLambda');
        },

        helperSexpr: function helperSexpr(sexpr, program, inverse) {
          var params = this.setupFullMustacheParams(sexpr, program, inverse),
              path = sexpr.path,
              name = path.parts[0];

          if (this.options.knownHelpers[name]) {
            this.opcode('invokeKnownHelper', params.length, name);
          } else if (this.options.knownHelpersOnly) {
            throw new _Exception2['default']('You specified knownHelpersOnly, but used the unknown helper ' + name, sexpr);
          } else {
            path.falsy = true;

            this.accept(path);
            this.opcode('invokeHelper', params.length, path.original, _AST2['default'].helpers.simpleId(path));
          }
        },

        PathExpression: function PathExpression(path) {
          this.addDepth(path.depth);
          this.opcode('getContext', path.depth);

          var name = path.parts[0],
              scoped = _AST2['default'].helpers.scopedId(path),
              blockParamId = !path.depth && !scoped && this.blockParamIndex(name);

          if (blockParamId) {
            this.opcode('lookupBlockParam', blockParamId, path.parts);
          } else if (!name) {
            // Context reference, i.e. `{{foo .}}` or `{{foo ..}}`
            this.opcode('pushContext');
          } else if (path.data) {
            this.options.data = true;
            this.opcode('lookupData', path.depth, path.parts);
          } else {
            this.opcode('lookupOnContext', path.parts, path.falsy, scoped);
          }
        },

        StringLiteral: function StringLiteral(string) {
          this.opcode('pushString', string.value);
        },

        NumberLiteral: function NumberLiteral(number) {
          this.opcode('pushLiteral', number.value);
        },

        BooleanLiteral: function BooleanLiteral(bool) {
          this.opcode('pushLiteral', bool.value);
        },

        UndefinedLiteral: function UndefinedLiteral() {
          this.opcode('pushLiteral', 'undefined');
        },

        NullLiteral: function NullLiteral() {
          this.opcode('pushLiteral', 'null');
        },

        Hash: function Hash(hash) {
          var pairs = hash.pairs,
              i = 0,
              l = pairs.length;

          this.opcode('pushHash');

          for (; i < l; i++) {
            this.pushParam(pairs[i].value);
          }
          while (i--) {
            this.opcode('assignToHash', pairs[i].key);
          }
          this.opcode('popHash');
        },

        // HELPERS
        opcode: function opcode(name) {
          this.opcodes.push({ opcode: name, args: slice.call(arguments, 1), loc: this.sourceNode[0].loc });
        },

        addDepth: function addDepth(depth) {
          if (!depth) {
            return;
          }

          this.useDepths = true;
        },

        classifySexpr: function classifySexpr(sexpr) {
          var isSimple = _AST2['default'].helpers.simpleId(sexpr.path);

          var isBlockParam = isSimple && !!this.blockParamIndex(sexpr.path.parts[0]);

          // a mustache is an eligible helper if:
          // * its id is simple (a single part, not `this` or `..`)
          var isHelper = !isBlockParam && _AST2['default'].helpers.helperExpression(sexpr);

          // if a mustache is an eligible helper but not a definite
          // helper, it is ambiguous, and will be resolved in a later
          // pass or at runtime.
          var isEligible = !isBlockParam && (isHelper || isSimple);

          // if ambiguous, we can possibly resolve the ambiguity now
          // An eligible helper is one that does not have a complex path, i.e. `this.foo`, `../foo` etc.
          if (isEligible && !isHelper) {
            var _name2 = sexpr.path.parts[0],
                options = this.options;

            if (options.knownHelpers[_name2]) {
              isHelper = true;
            } else if (options.knownHelpersOnly) {
              isEligible = false;
            }
          }

          if (isHelper) {
            return 'helper';
          } else if (isEligible) {
            return 'ambiguous';
          } else {
            return 'simple';
          }
        },

        pushParams: function pushParams(params) {
          for (var i = 0, l = params.length; i < l; i++) {
            this.pushParam(params[i]);
          }
        },

        pushParam: function pushParam(val) {
          var value = val.value != null ? val.value : val.original || '';

          if (this.stringParams) {
            if (value.replace) {
              value = value.replace(/^(\.?\.\/)*/g, '').replace(/\//g, '.');
            }

            if (val.depth) {
              this.addDepth(val.depth);
            }
            this.opcode('getContext', val.depth || 0);
            this.opcode('pushStringParam', value, val.type);

            if (val.type === 'SubExpression') {
              // SubExpressions get evaluated and passed in
              // in string params mode.
              this.accept(val);
            }
          } else {
            if (this.trackIds) {
              var blockParamIndex = undefined;
              if (val.parts && !_AST2['default'].helpers.scopedId(val) && !val.depth) {
                blockParamIndex = this.blockParamIndex(val.parts[0]);
              }
              if (blockParamIndex) {
                var blockParamChild = val.parts.slice(1).join('.');
                this.opcode('pushId', 'BlockParam', blockParamIndex, blockParamChild);
              } else {
                value = val.original || value;
                if (value.replace) {
                  value = value.replace(/^\.\//g, '').replace(/^\.$/g, '');
                }

                this.opcode('pushId', val.type, value);
              }
            }
            this.accept(val);
          }
        },

        setupFullMustacheParams: function setupFullMustacheParams(sexpr, program, inverse, omitEmpty) {
          var params = sexpr.params;
          this.pushParams(params);

          this.opcode('pushProgram', program);
          this.opcode('pushProgram', inverse);

          if (sexpr.hash) {
            this.accept(sexpr.hash);
          } else {
            this.opcode('emptyHash', omitEmpty);
          }

          return params;
        },

        blockParamIndex: function blockParamIndex(name) {
          for (var depth = 0, len = this.options.blockParams.length; depth < len; depth++) {
            var blockParams = this.options.blockParams[depth],
                param = blockParams && _isArray$indexOf.indexOf(blockParams, name);
            if (blockParams && param >= 0) {
              return [depth, param];
            }
          }
        }
      };

      function precompile(input, options, env) {
        if (input == null || typeof input !== 'string' && input.type !== 'Program') {
          throw new _Exception2['default']('You must pass a string or Handlebars AST to Handlebars.precompile. You passed ' + input);
        }

        options = options || {};
        if (!('data' in options)) {
          options.data = true;
        }
        if (options.compat) {
          options.useDepths = true;
        }

        var ast = env.parse(input, options),
            environment = new env.Compiler().compile(ast, options);
        return new env.JavaScriptCompiler().compile(environment, options);
      }

      function compile(input, _x, env) {
        var options = arguments[1] === undefined ? {} : arguments[1];

        if (input == null || typeof input !== 'string' && input.type !== 'Program') {
          throw new _Exception2['default']('You must pass a string or Handlebars AST to Handlebars.compile. You passed ' + input);
        }

        if (!('data' in options)) {
          options.data = true;
        }
        if (options.compat) {
          options.useDepths = true;
        }

        var compiled = undefined;

        function compileInput() {
          var ast = env.parse(input, options),
              environment = new env.Compiler().compile(ast, options),
              templateSpec = new env.JavaScriptCompiler().compile(environment, options, undefined, true);
          return env.template(templateSpec);
        }

        // Template is only compiled on first use and cached after that point.
        function ret(context, execOptions) {
          if (!compiled) {
            compiled = compileInput();
          }
          return compiled.call(this, context, execOptions);
        }
        ret._setup = function (setupOptions) {
          if (!compiled) {
            compiled = compileInput();
          }
          return compiled._setup(setupOptions);
        };
        ret._child = function (i, data, blockParams, depths) {
          if (!compiled) {
            compiled = compileInput();
          }
          return compiled._child(i, data, blockParams, depths);
        };
        return ret;
      }

      function argEquals(a, b) {
        if (a === b) {
          return true;
        }

        if (_isArray$indexOf.isArray(a) && _isArray$indexOf.isArray(b) && a.length === b.length) {
          for (var i = 0; i < a.length; i++) {
            if (!argEquals(a[i], b[i])) {
              return false;
            }
          }
          return true;
        }
      }

      function transformLiteralToPath(sexpr) {
        if (!sexpr.path.parts) {
          var literal = sexpr.path;
          // Casting to string here to make false and 0 literal values play nicely with the rest
          // of the system.
          sexpr.path = new _AST2['default'].PathExpression(false, 0, [literal.original + ''], literal.original + '', literal.loc);
        }
      }

      /***/ },
    /* 5 */
    /***/ function(module, exports, __webpack_require__) {

      'use strict';

      var _interopRequireDefault = __webpack_require__(8)['default'];

      exports.__esModule = true;

      var _COMPILER_REVISION$REVISION_CHANGES = __webpack_require__(10);

      var _Exception = __webpack_require__(12);

      var _Exception2 = _interopRequireDefault(_Exception);

      var _isArray = __webpack_require__(13);

      var _CodeGen = __webpack_require__(18);

      var _CodeGen2 = _interopRequireDefault(_CodeGen);

      function Literal(value) {
        this.value = value;
      }

      function JavaScriptCompiler() {}

      JavaScriptCompiler.prototype = {
        // PUBLIC API: You can override these methods in a subclass to provide
        // alternative compiled forms for name lookup and buffering semantics
        nameLookup: function nameLookup(parent, name /* , type*/) {
          if (JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
            return [parent, '.', name];
          } else {
            return [parent, '[\'', name, '\']'];
          }
        },
        depthedLookup: function depthedLookup(name) {
          return [this.aliasable('this.lookup'), '(depths, "', name, '")'];
        },

        compilerInfo: function compilerInfo() {
          var revision = _COMPILER_REVISION$REVISION_CHANGES.COMPILER_REVISION,
              versions = _COMPILER_REVISION$REVISION_CHANGES.REVISION_CHANGES[revision];
          return [revision, versions];
        },

        appendToBuffer: function appendToBuffer(source, location, explicit) {
          // Force a source as this simplifies the merge logic.
          if (!_isArray.isArray(source)) {
            source = [source];
          }
          source = this.source.wrap(source, location);

          if (this.environment.isSimple) {
            return ['return ', source, ';'];
          } else if (explicit) {
            // This is a case where the buffer operation occurs as a child of another
            // construct, generally braces. We have to explicitly output these buffer
            // operations to ensure that the emitted code goes in the correct location.
            return ['buffer += ', source, ';'];
          } else {
            source.appendToBuffer = true;
            return source;
          }
        },

        initializeBuffer: function initializeBuffer() {
          return this.quotedString('');
        },
        // END PUBLIC API

        compile: function compile(environment, options, context, asObject) {
          this.environment = environment;
          this.options = options;
          this.stringParams = this.options.stringParams;
          this.trackIds = this.options.trackIds;
          this.precompile = !asObject;

          this.name = this.environment.name;
          this.isChild = !!context;
          this.context = context || {
                programs: [],
                environments: []
              };

          this.preamble();

          this.stackSlot = 0;
          this.stackVars = [];
          this.aliases = {};
          this.registers = { list: [] };
          this.hashes = [];
          this.compileStack = [];
          this.inlineStack = [];
          this.blockParams = [];

          this.compileChildren(environment, options);

          this.useDepths = this.useDepths || environment.useDepths || this.options.compat;
          this.useBlockParams = this.useBlockParams || environment.useBlockParams;

          var opcodes = environment.opcodes,
              opcode = undefined,
              firstLoc = undefined,
              i = undefined,
              l = undefined;

          for (i = 0, l = opcodes.length; i < l; i++) {
            opcode = opcodes[i];

            this.source.currentLocation = opcode.loc;
            firstLoc = firstLoc || opcode.loc;
            this[opcode.opcode].apply(this, opcode.args);
          }

          // Flush any trailing content that might be pending.
          this.source.currentLocation = firstLoc;
          this.pushSource('');

          /* istanbul ignore next */
          if (this.stackSlot || this.inlineStack.length || this.compileStack.length) {
            throw new _Exception2['default']('Compile completed with content left on stack');
          }

          var fn = this.createFunctionContext(asObject);
          if (!this.isChild) {
            var ret = {
              compiler: this.compilerInfo(),
              main: fn
            };
            var programs = this.context.programs;
            for (i = 0, l = programs.length; i < l; i++) {
              if (programs[i]) {
                ret[i] = programs[i];
              }
            }

            if (this.environment.usePartial) {
              ret.usePartial = true;
            }
            if (this.options.data) {
              ret.useData = true;
            }
            if (this.useDepths) {
              ret.useDepths = true;
            }
            if (this.useBlockParams) {
              ret.useBlockParams = true;
            }
            if (this.options.compat) {
              ret.compat = true;
            }

            if (!asObject) {
              ret.compiler = JSON.stringify(ret.compiler);

              this.source.currentLocation = { start: { line: 1, column: 0 } };
              ret = this.objectLiteral(ret);

              if (options.srcName) {
                ret = ret.toStringWithSourceMap({ file: options.destName });
                ret.map = ret.map && ret.map.toString();
              } else {
                ret = ret.toString();
              }
            } else {
              ret.compilerOptions = this.options;
            }

            return ret;
          } else {
            return fn;
          }
        },

        preamble: function preamble() {
          // track the last context pushed into place to allow skipping the
          // getContext opcode when it would be a noop
          this.lastContext = 0;
          this.source = new _CodeGen2['default'](this.options.srcName);
        },

        createFunctionContext: function createFunctionContext(asObject) {
          var varDeclarations = '';

          var locals = this.stackVars.concat(this.registers.list);
          if (locals.length > 0) {
            varDeclarations += ', ' + locals.join(', ');
          }

          // Generate minimizer alias mappings
          //
          // When using true SourceNodes, this will update all references to the given alias
          // as the source nodes are reused in situ. For the non-source node compilation mode,
          // aliases will not be used, but this case is already being run on the client and
          // we aren't concern about minimizing the template size.
          var aliasCount = 0;
          for (var alias in this.aliases) {
            // eslint-disable-line guard-for-in
            var node = this.aliases[alias];

            if (this.aliases.hasOwnProperty(alias) && node.children && node.referenceCount > 1) {
              varDeclarations += ', alias' + ++aliasCount + '=' + alias;
              node.children[0] = 'alias' + aliasCount;
            }
          }

          var params = ['depth0', 'helpers', 'partials', 'data'];

          if (this.useBlockParams || this.useDepths) {
            params.push('blockParams');
          }
          if (this.useDepths) {
            params.push('depths');
          }

          // Perform a second pass over the output to merge content when possible
          var source = this.mergeSource(varDeclarations);

          if (asObject) {
            params.push(source);

            return Function.apply(this, params);
          } else {
            return this.source.wrap(['function(', params.join(','), ') {\n  ', source, '}']);
          }
        },
        mergeSource: function mergeSource(varDeclarations) {
          var isSimple = this.environment.isSimple,
              appendOnly = !this.forceBuffer,
              appendFirst = undefined,
              sourceSeen = undefined,
              bufferStart = undefined,
              bufferEnd = undefined;
          this.source.each(function (line) {
            if (line.appendToBuffer) {
              if (bufferStart) {
                line.prepend('  + ');
              } else {
                bufferStart = line;
              }
              bufferEnd = line;
            } else {
              if (bufferStart) {
                if (!sourceSeen) {
                  appendFirst = true;
                } else {
                  bufferStart.prepend('buffer += ');
                }
                bufferEnd.add(';');
                bufferStart = bufferEnd = undefined;
              }

              sourceSeen = true;
              if (!isSimple) {
                appendOnly = false;
              }
            }
          });

          if (appendOnly) {
            if (bufferStart) {
              bufferStart.prepend('return ');
              bufferEnd.add(';');
            } else if (!sourceSeen) {
              this.source.push('return "";');
            }
          } else {
            varDeclarations += ', buffer = ' + (appendFirst ? '' : this.initializeBuffer());

            if (bufferStart) {
              bufferStart.prepend('return buffer + ');
              bufferEnd.add(';');
            } else {
              this.source.push('return buffer;');
            }
          }

          if (varDeclarations) {
            this.source.prepend('var ' + varDeclarations.substring(2) + (appendFirst ? '' : ';\n'));
          }

          return this.source.merge();
        },

        // [blockValue]
        //
        // On stack, before: hash, inverse, program, value
        // On stack, after: return value of blockHelperMissing
        //
        // The purpose of this opcode is to take a block of the form
        // `{{#this.foo}}...{{/this.foo}}`, resolve the value of `foo`, and
        // replace it on the stack with the result of properly
        // invoking blockHelperMissing.
        blockValue: function blockValue(name) {
          var blockHelperMissing = this.aliasable('helpers.blockHelperMissing'),
              params = [this.contextName(0)];
          this.setupHelperArgs(name, 0, params);

          var blockName = this.popStack();
          params.splice(1, 0, blockName);

          this.push(this.source.functionCall(blockHelperMissing, 'call', params));
        },

        // [ambiguousBlockValue]
        //
        // On stack, before: hash, inverse, program, value
        // Compiler value, before: lastHelper=value of last found helper, if any
        // On stack, after, if no lastHelper: same as [blockValue]
        // On stack, after, if lastHelper: value
        ambiguousBlockValue: function ambiguousBlockValue() {
          // We're being a bit cheeky and reusing the options value from the prior exec
          var blockHelperMissing = this.aliasable('helpers.blockHelperMissing'),
              params = [this.contextName(0)];
          this.setupHelperArgs('', 0, params, true);

          this.flushInline();

          var current = this.topStack();
          params.splice(1, 0, current);

          this.pushSource(['if (!', this.lastHelper, ') { ', current, ' = ', this.source.functionCall(blockHelperMissing, 'call', params), '}']);
        },

        // [appendContent]
        //
        // On stack, before: ...
        // On stack, after: ...
        //
        // Appends the string value of `content` to the current buffer
        appendContent: function appendContent(content) {
          if (this.pendingContent) {
            content = this.pendingContent + content;
          } else {
            this.pendingLocation = this.source.currentLocation;
          }

          this.pendingContent = content;
        },

        // [append]
        //
        // On stack, before: value, ...
        // On stack, after: ...
        //
        // Coerces `value` to a String and appends it to the current buffer.
        //
        // If `value` is truthy, or 0, it is coerced into a string and appended
        // Otherwise, the empty string is appended
        append: function append() {
          if (this.isInline()) {
            this.replaceStack(function (current) {
              return [' != null ? ', current, ' : ""'];
            });

            this.pushSource(this.appendToBuffer(this.popStack()));
          } else {
            var local = this.popStack();
            this.pushSource(['if (', local, ' != null) { ', this.appendToBuffer(local, undefined, true), ' }']);
            if (this.environment.isSimple) {
              this.pushSource(['else { ', this.appendToBuffer('\'\'', undefined, true), ' }']);
            }
          }
        },

        // [appendEscaped]
        //
        // On stack, before: value, ...
        // On stack, after: ...
        //
        // Escape `value` and append it to the buffer
        appendEscaped: function appendEscaped() {
          this.pushSource(this.appendToBuffer([this.aliasable('this.escapeExpression'), '(', this.popStack(), ')']));
        },

        // [getContext]
        //
        // On stack, before: ...
        // On stack, after: ...
        // Compiler value, after: lastContext=depth
        //
        // Set the value of the `lastContext` compiler value to the depth
        getContext: function getContext(depth) {
          this.lastContext = depth;
        },

        // [pushContext]
        //
        // On stack, before: ...
        // On stack, after: currentContext, ...
        //
        // Pushes the value of the current context onto the stack.
        pushContext: function pushContext() {
          this.pushStackLiteral(this.contextName(this.lastContext));
        },

        // [lookupOnContext]
        //
        // On stack, before: ...
        // On stack, after: currentContext[name], ...
        //
        // Looks up the value of `name` on the current context and pushes
        // it onto the stack.
        lookupOnContext: function lookupOnContext(parts, falsy, scoped) {
          var i = 0;

          if (!scoped && this.options.compat && !this.lastContext) {
            // The depthed query is expected to handle the undefined logic for the root level that
            // is implemented below, so we evaluate that directly in compat mode
            this.push(this.depthedLookup(parts[i++]));
          } else {
            this.pushContext();
          }

          this.resolvePath('context', parts, i, falsy);
        },

        // [lookupBlockParam]
        //
        // On stack, before: ...
        // On stack, after: blockParam[name], ...
        //
        // Looks up the value of `parts` on the given block param and pushes
        // it onto the stack.
        lookupBlockParam: function lookupBlockParam(blockParamId, parts) {
          this.useBlockParams = true;

          this.push(['blockParams[', blockParamId[0], '][', blockParamId[1], ']']);
          this.resolvePath('context', parts, 1);
        },

        // [lookupData]
        //
        // On stack, before: ...
        // On stack, after: data, ...
        //
        // Push the data lookup operator
        lookupData: function lookupData(depth, parts) {
          if (!depth) {
            this.pushStackLiteral('data');
          } else {
            this.pushStackLiteral('this.data(data, ' + depth + ')');
          }

          this.resolvePath('data', parts, 0, true);
        },

        resolvePath: function resolvePath(type, parts, i, falsy) {
          var _this = this;

          if (this.options.strict || this.options.assumeObjects) {
            this.push(strictLookup(this.options.strict, this, parts, type));
            return;
          }

          var len = parts.length;
          for (; i < len; i++) {
            /*eslint-disable no-loop-func */
            this.replaceStack(function (current) {
              var lookup = _this.nameLookup(current, parts[i], type);
              // We want to ensure that zero and false are handled properly if the context (falsy flag)
              // needs to have the special handling for these values.
              if (!falsy) {
                return [' != null ? ', lookup, ' : ', current];
              } else {
                // Otherwise we can use generic falsy handling
                return [' && ', lookup];
              }
            });
            /*eslint-enable no-loop-func */
          }
        },

        // [resolvePossibleLambda]
        //
        // On stack, before: value, ...
        // On stack, after: resolved value, ...
        //
        // If the `value` is a lambda, replace it on the stack by
        // the return value of the lambda
        resolvePossibleLambda: function resolvePossibleLambda() {
          this.push([this.aliasable('this.lambda'), '(', this.popStack(), ', ', this.contextName(0), ')']);
        },

        // [pushStringParam]
        //
        // On stack, before: ...
        // On stack, after: string, currentContext, ...
        //
        // This opcode is designed for use in string mode, which
        // provides the string value of a parameter along with its
        // depth rather than resolving it immediately.
        pushStringParam: function pushStringParam(string, type) {
          this.pushContext();
          this.pushString(type);

          // If it's a subexpression, the string result
          // will be pushed after this opcode.
          if (type !== 'SubExpression') {
            if (typeof string === 'string') {
              this.pushString(string);
            } else {
              this.pushStackLiteral(string);
            }
          }
        },

        emptyHash: function emptyHash(omitEmpty) {
          if (this.trackIds) {
            this.push('{}'); // hashIds
          }
          if (this.stringParams) {
            this.push('{}'); // hashContexts
            this.push('{}'); // hashTypes
          }
          this.pushStackLiteral(omitEmpty ? 'undefined' : '{}');
        },
        pushHash: function pushHash() {
          if (this.hash) {
            this.hashes.push(this.hash);
          }
          this.hash = { values: [], types: [], contexts: [], ids: [] };
        },
        popHash: function popHash() {
          var hash = this.hash;
          this.hash = this.hashes.pop();

          if (this.trackIds) {
            this.push(this.objectLiteral(hash.ids));
          }
          if (this.stringParams) {
            this.push(this.objectLiteral(hash.contexts));
            this.push(this.objectLiteral(hash.types));
          }

          this.push(this.objectLiteral(hash.values));
        },

        // [pushString]
        //
        // On stack, before: ...
        // On stack, after: quotedString(string), ...
        //
        // Push a quoted version of `string` onto the stack
        pushString: function pushString(string) {
          this.pushStackLiteral(this.quotedString(string));
        },

        // [pushLiteral]
        //
        // On stack, before: ...
        // On stack, after: value, ...
        //
        // Pushes a value onto the stack. This operation prevents
        // the compiler from creating a temporary variable to hold
        // it.
        pushLiteral: function pushLiteral(value) {
          this.pushStackLiteral(value);
        },

        // [pushProgram]
        //
        // On stack, before: ...
        // On stack, after: program(guid), ...
        //
        // Push a program expression onto the stack. This takes
        // a compile-time guid and converts it into a runtime-accessible
        // expression.
        pushProgram: function pushProgram(guid) {
          if (guid != null) {
            this.pushStackLiteral(this.programExpression(guid));
          } else {
            this.pushStackLiteral(null);
          }
        },

        // [invokeHelper]
        //
        // On stack, before: hash, inverse, program, params..., ...
        // On stack, after: result of helper invocation
        //
        // Pops off the helper's parameters, invokes the helper,
        // and pushes the helper's return value onto the stack.
        //
        // If the helper is not found, `helperMissing` is called.
        invokeHelper: function invokeHelper(paramSize, name, isSimple) {
          var nonHelper = this.popStack(),
              helper = this.setupHelper(paramSize, name),
              simple = isSimple ? [helper.name, ' || '] : '';

          var lookup = ['('].concat(simple, nonHelper);
          if (!this.options.strict) {
            lookup.push(' || ', this.aliasable('helpers.helperMissing'));
          }
          lookup.push(')');

          this.push(this.source.functionCall(lookup, 'call', helper.callParams));
        },

        // [invokeKnownHelper]
        //
        // On stack, before: hash, inverse, program, params..., ...
        // On stack, after: result of helper invocation
        //
        // This operation is used when the helper is known to exist,
        // so a `helperMissing` fallback is not required.
        invokeKnownHelper: function invokeKnownHelper(paramSize, name) {
          var helper = this.setupHelper(paramSize, name);
          this.push(this.source.functionCall(helper.name, 'call', helper.callParams));
        },

        // [invokeAmbiguous]
        //
        // On stack, before: hash, inverse, program, params..., ...
        // On stack, after: result of disambiguation
        //
        // This operation is used when an expression like `{{foo}}`
        // is provided, but we don't know at compile-time whether it
        // is a helper or a path.
        //
        // This operation emits more code than the other options,
        // and can be avoided by passing the `knownHelpers` and
        // `knownHelpersOnly` flags at compile-time.
        invokeAmbiguous: function invokeAmbiguous(name, helperCall) {
          this.useRegister('helper');

          var nonHelper = this.popStack();

          this.emptyHash();
          var helper = this.setupHelper(0, name, helperCall);

          var helperName = this.lastHelper = this.nameLookup('helpers', name, 'helper');

          var lookup = ['(', '(helper = ', helperName, ' || ', nonHelper, ')'];
          if (!this.options.strict) {
            lookup[0] = '(helper = ';
            lookup.push(' != null ? helper : ', this.aliasable('helpers.helperMissing'));
          }

          this.push(['(', lookup, helper.paramsInit ? ['),(', helper.paramsInit] : [], '),', '(typeof helper === ', this.aliasable('"function"'), ' ? ', this.source.functionCall('helper', 'call', helper.callParams), ' : helper))']);
        },

        // [invokePartial]
        //
        // On stack, before: context, ...
        // On stack after: result of partial invocation
        //
        // This operation pops off a context, invokes a partial with that context,
        // and pushes the result of the invocation back.
        invokePartial: function invokePartial(isDynamic, name, indent) {
          var params = [],
              options = this.setupParams(name, 1, params, false);

          if (isDynamic) {
            name = this.popStack();
            delete options.name;
          }

          if (indent) {
            options.indent = JSON.stringify(indent);
          }
          options.helpers = 'helpers';
          options.partials = 'partials';

          if (!isDynamic) {
            params.unshift(this.nameLookup('partials', name, 'partial'));
          } else {
            params.unshift(name);
          }

          if (this.options.compat) {
            options.depths = 'depths';
          }
          options = this.objectLiteral(options);
          params.push(options);

          this.push(this.source.functionCall('this.invokePartial', '', params));
        },

        // [assignToHash]
        //
        // On stack, before: value, ..., hash, ...
        // On stack, after: ..., hash, ...
        //
        // Pops a value off the stack and assigns it to the current hash
        assignToHash: function assignToHash(key) {
          var value = this.popStack(),
              context = undefined,
              type = undefined,
              id = undefined;

          if (this.trackIds) {
            id = this.popStack();
          }
          if (this.stringParams) {
            type = this.popStack();
            context = this.popStack();
          }

          var hash = this.hash;
          if (context) {
            hash.contexts[key] = context;
          }
          if (type) {
            hash.types[key] = type;
          }
          if (id) {
            hash.ids[key] = id;
          }
          hash.values[key] = value;
        },

        pushId: function pushId(type, name, child) {
          if (type === 'BlockParam') {
            this.pushStackLiteral('blockParams[' + name[0] + '].path[' + name[1] + ']' + (child ? ' + ' + JSON.stringify('.' + child) : ''));
          } else if (type === 'PathExpression') {
            this.pushString(name);
          } else if (type === 'SubExpression') {
            this.pushStackLiteral('true');
          } else {
            this.pushStackLiteral('null');
          }
        },

        // HELPERS

        compiler: JavaScriptCompiler,

        compileChildren: function compileChildren(environment, options) {
          var children = environment.children,
              child = undefined,
              compiler = undefined;

          for (var i = 0, l = children.length; i < l; i++) {
            child = children[i];
            compiler = new this.compiler(); // eslint-disable-line new-cap

            var index = this.matchExistingProgram(child);

            if (index == null) {
              this.context.programs.push(''); // Placeholder to prevent name conflicts for nested children
              index = this.context.programs.length;
              child.index = index;
              child.name = 'program' + index;
              this.context.programs[index] = compiler.compile(child, options, this.context, !this.precompile);
              this.context.environments[index] = child;

              this.useDepths = this.useDepths || compiler.useDepths;
              this.useBlockParams = this.useBlockParams || compiler.useBlockParams;
            } else {
              child.index = index;
              child.name = 'program' + index;

              this.useDepths = this.useDepths || child.useDepths;
              this.useBlockParams = this.useBlockParams || child.useBlockParams;
            }
          }
        },
        matchExistingProgram: function matchExistingProgram(child) {
          for (var i = 0, len = this.context.environments.length; i < len; i++) {
            var environment = this.context.environments[i];
            if (environment && environment.equals(child)) {
              return i;
            }
          }
        },

        programExpression: function programExpression(guid) {
          var child = this.environment.children[guid],
              programParams = [child.index, 'data', child.blockParams];

          if (this.useBlockParams || this.useDepths) {
            programParams.push('blockParams');
          }
          if (this.useDepths) {
            programParams.push('depths');
          }

          return 'this.program(' + programParams.join(', ') + ')';
        },

        useRegister: function useRegister(name) {
          if (!this.registers[name]) {
            this.registers[name] = true;
            this.registers.list.push(name);
          }
        },

        push: function push(expr) {
          if (!(expr instanceof Literal)) {
            expr = this.source.wrap(expr);
          }

          this.inlineStack.push(expr);
          return expr;
        },

        pushStackLiteral: function pushStackLiteral(item) {
          this.push(new Literal(item));
        },

        pushSource: function pushSource(source) {
          if (this.pendingContent) {
            this.source.push(this.appendToBuffer(this.source.quotedString(this.pendingContent), this.pendingLocation));
            this.pendingContent = undefined;
          }

          if (source) {
            this.source.push(source);
          }
        },

        replaceStack: function replaceStack(callback) {
          var prefix = ['('],
              stack = undefined,
              createdStack = undefined,
              usedLiteral = undefined;

          /* istanbul ignore next */
          if (!this.isInline()) {
            throw new _Exception2['default']('replaceStack on non-inline');
          }

          // We want to merge the inline statement into the replacement statement via ','
          var top = this.popStack(true);

          if (top instanceof Literal) {
            // Literals do not need to be inlined
            stack = [top.value];
            prefix = ['(', stack];
            usedLiteral = true;
          } else {
            // Get or create the current stack name for use by the inline
            createdStack = true;
            var _name = this.incrStack();

            prefix = ['((', this.push(_name), ' = ', top, ')'];
            stack = this.topStack();
          }

          var item = callback.call(this, stack);

          if (!usedLiteral) {
            this.popStack();
          }
          if (createdStack) {
            this.stackSlot--;
          }
          this.push(prefix.concat(item, ')'));
        },

        incrStack: function incrStack() {
          this.stackSlot++;
          if (this.stackSlot > this.stackVars.length) {
            this.stackVars.push('stack' + this.stackSlot);
          }
          return this.topStackName();
        },
        topStackName: function topStackName() {
          return 'stack' + this.stackSlot;
        },
        flushInline: function flushInline() {
          var inlineStack = this.inlineStack;
          this.inlineStack = [];
          for (var i = 0, len = inlineStack.length; i < len; i++) {
            var entry = inlineStack[i];
            /* istanbul ignore if */
            if (entry instanceof Literal) {
              this.compileStack.push(entry);
            } else {
              var stack = this.incrStack();
              this.pushSource([stack, ' = ', entry, ';']);
              this.compileStack.push(stack);
            }
          }
        },
        isInline: function isInline() {
          return this.inlineStack.length;
        },

        popStack: function popStack(wrapped) {
          var inline = this.isInline(),
              item = (inline ? this.inlineStack : this.compileStack).pop();

          if (!wrapped && item instanceof Literal) {
            return item.value;
          } else {
            if (!inline) {
              /* istanbul ignore next */
              if (!this.stackSlot) {
                throw new _Exception2['default']('Invalid stack pop');
              }
              this.stackSlot--;
            }
            return item;
          }
        },

        topStack: function topStack() {
          var stack = this.isInline() ? this.inlineStack : this.compileStack,
              item = stack[stack.length - 1];

          /* istanbul ignore if */
          if (item instanceof Literal) {
            return item.value;
          } else {
            return item;
          }
        },

        contextName: function contextName(context) {
          if (this.useDepths && context) {
            return 'depths[' + context + ']';
          } else {
            return 'depth' + context;
          }
        },

        quotedString: function quotedString(str) {
          return this.source.quotedString(str);
        },

        objectLiteral: function objectLiteral(obj) {
          return this.source.objectLiteral(obj);
        },

        aliasable: function aliasable(name) {
          var ret = this.aliases[name];
          if (ret) {
            ret.referenceCount++;
            return ret;
          }

          ret = this.aliases[name] = this.source.wrap(name);
          ret.aliasable = true;
          ret.referenceCount = 1;

          return ret;
        },

        setupHelper: function setupHelper(paramSize, name, blockHelper) {
          var params = [],
              paramsInit = this.setupHelperArgs(name, paramSize, params, blockHelper);
          var foundHelper = this.nameLookup('helpers', name, 'helper');

          return {
            params: params,
            paramsInit: paramsInit,
            name: foundHelper,
            callParams: [this.contextName(0)].concat(params)
          };
        },

        setupParams: function setupParams(helper, paramSize, params) {
          var options = {},
              contexts = [],
              types = [],
              ids = [],
              param = undefined;

          options.name = this.quotedString(helper);
          options.hash = this.popStack();

          if (this.trackIds) {
            options.hashIds = this.popStack();
          }
          if (this.stringParams) {
            options.hashTypes = this.popStack();
            options.hashContexts = this.popStack();
          }

          var inverse = this.popStack(),
              program = this.popStack();

          // Avoid setting fn and inverse if neither are set. This allows
          // helpers to do a check for `if (options.fn)`
          if (program || inverse) {
            options.fn = program || 'this.noop';
            options.inverse = inverse || 'this.noop';
          }

          // The parameters go on to the stack in order (making sure that they are evaluated in order)
          // so we need to pop them off the stack in reverse order
          var i = paramSize;
          while (i--) {
            param = this.popStack();
            params[i] = param;

            if (this.trackIds) {
              ids[i] = this.popStack();
            }
            if (this.stringParams) {
              types[i] = this.popStack();
              contexts[i] = this.popStack();
            }
          }

          if (this.trackIds) {
            options.ids = this.source.generateArray(ids);
          }
          if (this.stringParams) {
            options.types = this.source.generateArray(types);
            options.contexts = this.source.generateArray(contexts);
          }

          if (this.options.data) {
            options.data = 'data';
          }
          if (this.useBlockParams) {
            options.blockParams = 'blockParams';
          }
          return options;
        },

        setupHelperArgs: function setupHelperArgs(helper, paramSize, params, useRegister) {
          var options = this.setupParams(helper, paramSize, params, true);
          options = this.objectLiteral(options);
          if (useRegister) {
            this.useRegister('options');
            params.push('options');
            return ['options=', options];
          } else {
            params.push(options);
            return '';
          }
        }
      };

      (function () {
        var reservedWords = ('break else new var' + ' case finally return void' + ' catch for switch while' + ' continue function this with' + ' default if throw' + ' delete in try' + ' do instanceof typeof' + ' abstract enum int short' + ' boolean export interface static' + ' byte extends long super' + ' char final native synchronized' + ' class float package throws' + ' const goto private transient' + ' debugger implements protected volatile' + ' double import public let yield await' + ' null true false').split(' ');

        var compilerWords = JavaScriptCompiler.RESERVED_WORDS = {};

        for (var i = 0, l = reservedWords.length; i < l; i++) {
          compilerWords[reservedWords[i]] = true;
        }
      })();

      JavaScriptCompiler.isValidJavaScriptVariableName = function (name) {
        return !JavaScriptCompiler.RESERVED_WORDS[name] && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name);
      };

      function strictLookup(requireTerminal, compiler, parts, type) {
        var stack = compiler.popStack(),
            i = 0,
            len = parts.length;
        if (requireTerminal) {
          len--;
        }

        for (; i < len; i++) {
          stack = compiler.nameLookup(stack, parts[i], type);
        }

        if (requireTerminal) {
          return [compiler.aliasable('this.strict'), '(', stack, ', ', compiler.quotedString(parts[i]), ')'];
        } else {
          return stack;
        }
      }

      exports['default'] = JavaScriptCompiler;
      module.exports = exports['default'];

      /***/ },
    /* 6 */
    /***/ function(module, exports, __webpack_require__) {

      'use strict';

      var _interopRequireDefault = __webpack_require__(8)['default'];

      exports.__esModule = true;

      var _Exception = __webpack_require__(12);

      var _Exception2 = _interopRequireDefault(_Exception);

      var _AST = __webpack_require__(2);

      var _AST2 = _interopRequireDefault(_AST);

      function Visitor() {
        this.parents = [];
      }

      Visitor.prototype = {
        constructor: Visitor,
        mutating: false,

        // Visits a given value. If mutating, will replace the value if necessary.
        acceptKey: function acceptKey(node, name) {
          var value = this.accept(node[name]);
          if (this.mutating) {
            // Hacky sanity check:
            if (value && (!value.type || !_AST2['default'][value.type])) {
              throw new _Exception2['default']('Unexpected node type "' + value.type + '" found when accepting ' + name + ' on ' + node.type);
            }
            node[name] = value;
          }
        },

        // Performs an accept operation with added sanity check to ensure
        // required keys are not removed.
        acceptRequired: function acceptRequired(node, name) {
          this.acceptKey(node, name);

          if (!node[name]) {
            throw new _Exception2['default'](node.type + ' requires ' + name);
          }
        },

        // Traverses a given array. If mutating, empty respnses will be removed
        // for child elements.
        acceptArray: function acceptArray(array) {
          for (var i = 0, l = array.length; i < l; i++) {
            this.acceptKey(array, i);

            if (!array[i]) {
              array.splice(i, 1);
              i--;
              l--;
            }
          }
        },

        accept: function accept(object) {
          if (!object) {
            return;
          }

          if (this.current) {
            this.parents.unshift(this.current);
          }
          this.current = object;

          var ret = this[object.type](object);

          this.current = this.parents.shift();

          if (!this.mutating || ret) {
            return ret;
          } else if (ret !== false) {
            return object;
          }
        },

        Program: function Program(program) {
          this.acceptArray(program.body);
        },

        MustacheStatement: function MustacheStatement(mustache) {
          this.acceptRequired(mustache, 'path');
          this.acceptArray(mustache.params);
          this.acceptKey(mustache, 'hash');
        },

        BlockStatement: function BlockStatement(block) {
          this.acceptRequired(block, 'path');
          this.acceptArray(block.params);
          this.acceptKey(block, 'hash');

          this.acceptKey(block, 'program');
          this.acceptKey(block, 'inverse');
        },

        PartialStatement: function PartialStatement(partial) {
          this.acceptRequired(partial, 'name');
          this.acceptArray(partial.params);
          this.acceptKey(partial, 'hash');
        },

        ContentStatement: function ContentStatement() {},
        CommentStatement: function CommentStatement() {},

        SubExpression: function SubExpression(sexpr) {
          this.acceptRequired(sexpr, 'path');
          this.acceptArray(sexpr.params);
          this.acceptKey(sexpr, 'hash');
        },

        PathExpression: function PathExpression() {},

        StringLiteral: function StringLiteral() {},
        NumberLiteral: function NumberLiteral() {},
        BooleanLiteral: function BooleanLiteral() {},
        UndefinedLiteral: function UndefinedLiteral() {},
        NullLiteral: function NullLiteral() {},

        Hash: function Hash(hash) {
          this.acceptArray(hash.pairs);
        },
        HashPair: function HashPair(pair) {
          this.acceptRequired(pair, 'value');
        }
      };

      exports['default'] = Visitor;
      module.exports = exports['default'];
      /* content */ /* comment */ /* path */ /* string */ /* number */ /* bool */ /* literal */ /* literal */

      /***/ },
    /* 7 */
    /***/ function(module, exports, __webpack_require__) {

      /* WEBPACK VAR INJECTION */(function(global) {'use strict';

        exports.__esModule = true;
        /*global window */

        exports['default'] = function (Handlebars) {
          /* istanbul ignore next */
          var root = typeof global !== 'undefined' ? global : window,
              $Handlebars = root.Handlebars;
          /* istanbul ignore next */
          Handlebars.noConflict = function () {
            if (root.Handlebars === Handlebars) {
              root.Handlebars = $Handlebars;
            }
          };
        };

        module.exports = exports['default'];
        /* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

      /***/ },
    /* 8 */
    /***/ function(module, exports, __webpack_require__) {

      "use strict";

      exports["default"] = function (obj) {
        return obj && obj.__esModule ? obj : {
          "default": obj
        };
      };

      exports.__esModule = true;

      /***/ },
    /* 9 */
    /***/ function(module, exports, __webpack_require__) {

      "use strict";

      exports["default"] = function (obj) {
        if (obj && obj.__esModule) {
          return obj;
        } else {
          var newObj = {};

          if (typeof obj === "object" && obj !== null) {
            for (var key in obj) {
              if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];
            }
          }

          newObj["default"] = obj;
          return newObj;
        }
      };

      exports.__esModule = true;

      /***/ },
    /* 10 */
    /***/ function(module, exports, __webpack_require__) {

      'use strict';

      var _interopRequireWildcard = __webpack_require__(9)['default'];

      var _interopRequireDefault = __webpack_require__(8)['default'];

      exports.__esModule = true;
      exports.HandlebarsEnvironment = HandlebarsEnvironment;
      exports.createFrame = createFrame;

      var _import = __webpack_require__(13);

      var Utils = _interopRequireWildcard(_import);

      var _Exception = __webpack_require__(12);

      var _Exception2 = _interopRequireDefault(_Exception);

      var VERSION = '3.0.1';
      exports.VERSION = VERSION;
      var COMPILER_REVISION = 6;

      exports.COMPILER_REVISION = COMPILER_REVISION;
      var REVISION_CHANGES = {
        1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
        2: '== 1.0.0-rc.3',
        3: '== 1.0.0-rc.4',
        4: '== 1.x.x',
        5: '== 2.0.0-alpha.x',
        6: '>= 2.0.0-beta.1'
      };

      exports.REVISION_CHANGES = REVISION_CHANGES;
      var isArray = Utils.isArray,
          isFunction = Utils.isFunction,
          toString = Utils.toString,
          objectType = '[object Object]';

      function HandlebarsEnvironment(helpers, partials) {
        this.helpers = helpers || {};
        this.partials = partials || {};

        registerDefaultHelpers(this);
      }

      HandlebarsEnvironment.prototype = {
        constructor: HandlebarsEnvironment,

        logger: logger,
        log: log,

        registerHelper: function registerHelper(name, fn) {
          if (toString.call(name) === objectType) {
            if (fn) {
              throw new _Exception2['default']('Arg not supported with multiple helpers');
            }
            Utils.extend(this.helpers, name);
          } else {
            this.helpers[name] = fn;
          }
        },
        unregisterHelper: function unregisterHelper(name) {
          delete this.helpers[name];
        },

        registerPartial: function registerPartial(name, partial) {
          if (toString.call(name) === objectType) {
            Utils.extend(this.partials, name);
          } else {
            if (typeof partial === 'undefined') {
              throw new _Exception2['default']('Attempting to register a partial as undefined');
            }
            this.partials[name] = partial;
          }
        },
        unregisterPartial: function unregisterPartial(name) {
          delete this.partials[name];
        }
      };

      function registerDefaultHelpers(instance) {
        instance.registerHelper('helperMissing', function () {
          if (arguments.length === 1) {
            // A missing field in a {{foo}} constuct.
            return undefined;
          } else {
            // Someone is actually trying to call something, blow up.
            throw new _Exception2['default']('Missing helper: "' + arguments[arguments.length - 1].name + '"');
          }
        });

        instance.registerHelper('blockHelperMissing', function (context, options) {
          var inverse = options.inverse,
              fn = options.fn;

          if (context === true) {
            return fn(this);
          } else if (context === false || context == null) {
            return inverse(this);
          } else if (isArray(context)) {
            if (context.length > 0) {
              if (options.ids) {
                options.ids = [options.name];
              }

              return instance.helpers.each(context, options);
            } else {
              return inverse(this);
            }
          } else {
            if (options.data && options.ids) {
              var data = createFrame(options.data);
              data.contextPath = Utils.appendContextPath(options.data.contextPath, options.name);
              options = { data: data };
            }

            return fn(context, options);
          }
        });

        instance.registerHelper('each', function (context, options) {
          if (!options) {
            throw new _Exception2['default']('Must pass iterator to #each');
          }

          var fn = options.fn,
              inverse = options.inverse,
              i = 0,
              ret = '',
              data = undefined,
              contextPath = undefined;

          if (options.data && options.ids) {
            contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
          }

          if (isFunction(context)) {
            context = context.call(this);
          }

          if (options.data) {
            data = createFrame(options.data);
          }

          function execIteration(field, index, last) {
            if (data) {
              data.key = field;
              data.index = index;
              data.first = index === 0;
              data.last = !!last;

              if (contextPath) {
                data.contextPath = contextPath + field;
              }
            }

            ret = ret + fn(context[field], {
                  data: data,
                  blockParams: Utils.blockParams([context[field], field], [contextPath + field, null])
                });
          }

          if (context && typeof context === 'object') {
            if (isArray(context)) {
              for (var j = context.length; i < j; i++) {
                execIteration(i, i, i === context.length - 1);
              }
            } else {
              var priorKey = undefined;

              for (var key in context) {
                if (context.hasOwnProperty(key)) {
                  // We're running the iterations one step out of sync so we can detect
                  // the last iteration without have to scan the object twice and create
                  // an itermediate keys array.
                  if (priorKey) {
                    execIteration(priorKey, i - 1);
                  }
                  priorKey = key;
                  i++;
                }
              }
              if (priorKey) {
                execIteration(priorKey, i - 1, true);
              }
            }
          }

          if (i === 0) {
            ret = inverse(this);
          }

          return ret;
        });

        instance.registerHelper('if', function (conditional, options) {
          if (isFunction(conditional)) {
            conditional = conditional.call(this);
          }

          // Default behavior is to render the positive path if the value is truthy and not empty.
          // The `includeZero` option may be set to treat the condtional as purely not empty based on the
          // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
          if (!options.hash.includeZero && !conditional || Utils.isEmpty(conditional)) {
            return options.inverse(this);
          } else {
            return options.fn(this);
          }
        });

        instance.registerHelper('unless', function (conditional, options) {
          return instance.helpers['if'].call(this, conditional, { fn: options.inverse, inverse: options.fn, hash: options.hash });
        });

        instance.registerHelper('with', function (context, options) {
          if (isFunction(context)) {
            context = context.call(this);
          }

          var fn = options.fn;

          if (!Utils.isEmpty(context)) {
            if (options.data && options.ids) {
              var data = createFrame(options.data);
              data.contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]);
              options = { data: data };
            }

            return fn(context, options);
          } else {
            return options.inverse(this);
          }
        });

        instance.registerHelper('log', function (message, options) {
          var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
          instance.log(level, message);
        });

        instance.registerHelper('lookup', function (obj, field) {
          return obj && obj[field];
        });
      }

      var logger = {
        methodMap: { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' },

        // State enum
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        level: 1,

        // Can be overridden in the host environment
        log: function log(level, message) {
          if (typeof console !== 'undefined' && logger.level <= level) {
            var method = logger.methodMap[level];
            (console[method] || console.log).call(console, message); // eslint-disable-line no-console
          }
        }
      };

      exports.logger = logger;
      var log = logger.log;

      exports.log = log;

      function createFrame(object) {
        var frame = Utils.extend({}, object);
        frame._parent = object;
        return frame;
      }

      /* [args, ]options */

      /***/ },
    /* 11 */
    /***/ function(module, exports, __webpack_require__) {

      'use strict';

      exports.__esModule = true;
      // Build out our basic SafeString type
      function SafeString(string) {
        this.string = string;
      }

      SafeString.prototype.toString = SafeString.prototype.toHTML = function () {
        return '' + this.string;
      };

      exports['default'] = SafeString;
      module.exports = exports['default'];

      /***/ },
    /* 12 */
    /***/ function(module, exports, __webpack_require__) {

      'use strict';

      exports.__esModule = true;

      var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

      function Exception(message, node) {
        var loc = node && node.loc,
            line = undefined,
            column = undefined;
        if (loc) {
          line = loc.start.line;
          column = loc.start.column;

          message += ' - ' + line + ':' + column;
        }

        var tmp = Error.prototype.constructor.call(this, message);

        // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
        for (var idx = 0; idx < errorProps.length; idx++) {
          this[errorProps[idx]] = tmp[errorProps[idx]];
        }

        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, Exception);
        }

        if (loc) {
          this.lineNumber = line;
          this.column = column;
        }
      }

      Exception.prototype = new Error();

      exports['default'] = Exception;
      module.exports = exports['default'];

      /***/ },
    /* 13 */
    /***/ function(module, exports, __webpack_require__) {

      'use strict';

      exports.__esModule = true;
      exports.extend = extend;

      // Older IE versions do not directly support indexOf so we must implement our own, sadly.
      exports.indexOf = indexOf;
      exports.escapeExpression = escapeExpression;
      exports.isEmpty = isEmpty;
      exports.blockParams = blockParams;
      exports.appendContextPath = appendContextPath;
      var escape = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#x27;',
        '`': '&#x60;'
      };

      var badChars = /[&<>"'`]/g,
          possible = /[&<>"'`]/;

      function escapeChar(chr) {
        return escape[chr];
      }

      function extend(obj /* , ...source */) {
        for (var i = 1; i < arguments.length; i++) {
          for (var key in arguments[i]) {
            if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
              obj[key] = arguments[i][key];
            }
          }
        }

        return obj;
      }

      var toString = Object.prototype.toString;

      exports.toString = toString;
      // Sourced from lodash
      // https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
      /*eslint-disable func-style, no-var */
      var isFunction = function isFunction(value) {
        return typeof value === 'function';
      };
      // fallback for older versions of Chrome and Safari
      /* istanbul ignore next */
      if (isFunction(/x/)) {
        exports.isFunction = isFunction = function (value) {
          return typeof value === 'function' && toString.call(value) === '[object Function]';
        };
      }
      var isFunction;
      exports.isFunction = isFunction;
      /*eslint-enable func-style, no-var */

      /* istanbul ignore next */
      var isArray = Array.isArray || function (value) {
            return value && typeof value === 'object' ? toString.call(value) === '[object Array]' : false;
          };exports.isArray = isArray;

      function indexOf(array, value) {
        for (var i = 0, len = array.length; i < len; i++) {
          if (array[i] === value) {
            return i;
          }
        }
        return -1;
      }

      function escapeExpression(string) {
        if (typeof string !== 'string') {
          // don't escape SafeStrings, since they're already safe
          if (string && string.toHTML) {
            return string.toHTML();
          } else if (string == null) {
            return '';
          } else if (!string) {
            return string + '';
          }

          // Force a string conversion as this will be done by the append regardless and
          // the regex test will do this transparently behind the scenes, causing issues if
          // an object's to string has escaped characters in it.
          string = '' + string;
        }

        if (!possible.test(string)) {
          return string;
        }
        return string.replace(badChars, escapeChar);
      }

      function isEmpty(value) {
        if (!value && value !== 0) {
          return true;
        } else if (isArray(value) && value.length === 0) {
          return true;
        } else {
          return false;
        }
      }

      function blockParams(params, ids) {
        params.path = ids;
        return params;
      }

      function appendContextPath(contextPath, id) {
        return (contextPath ? contextPath + '.' : '') + id;
      }

      /***/ },
    /* 14 */
    /***/ function(module, exports, __webpack_require__) {

      'use strict';

      var _interopRequireWildcard = __webpack_require__(9)['default'];

      var _interopRequireDefault = __webpack_require__(8)['default'];

      exports.__esModule = true;
      exports.checkRevision = checkRevision;

      // TODO: Remove this line and break up compilePartial

      exports.template = template;
      exports.wrapProgram = wrapProgram;
      exports.resolvePartial = resolvePartial;
      exports.invokePartial = invokePartial;
      exports.noop = noop;

      var _import = __webpack_require__(13);

      var Utils = _interopRequireWildcard(_import);

      var _Exception = __webpack_require__(12);

      var _Exception2 = _interopRequireDefault(_Exception);

      var _COMPILER_REVISION$REVISION_CHANGES$createFrame = __webpack_require__(10);

      function checkRevision(compilerInfo) {
        var compilerRevision = compilerInfo && compilerInfo[0] || 1,
            currentRevision = _COMPILER_REVISION$REVISION_CHANGES$createFrame.COMPILER_REVISION;

        if (compilerRevision !== currentRevision) {
          if (compilerRevision < currentRevision) {
            var runtimeVersions = _COMPILER_REVISION$REVISION_CHANGES$createFrame.REVISION_CHANGES[currentRevision],
                compilerVersions = _COMPILER_REVISION$REVISION_CHANGES$createFrame.REVISION_CHANGES[compilerRevision];
            throw new _Exception2['default']('Template was precompiled with an older version of Handlebars than the current runtime. ' + 'Please update your precompiler to a newer version (' + runtimeVersions + ') or downgrade your runtime to an older version (' + compilerVersions + ').');
          } else {
            // Use the embedded version info since the runtime doesn't know about this revision yet
            throw new _Exception2['default']('Template was precompiled with a newer version of Handlebars than the current runtime. ' + 'Please update your runtime to a newer version (' + compilerInfo[1] + ').');
          }
        }
      }

      function template(templateSpec, env) {
        /* istanbul ignore next */
        if (!env) {
          throw new _Exception2['default']('No environment passed to template');
        }
        if (!templateSpec || !templateSpec.main) {
          throw new _Exception2['default']('Unknown template object: ' + typeof templateSpec);
        }

        // Note: Using env.VM references rather than local var references throughout this section to allow
        // for external users to override these as psuedo-supported APIs.
        env.VM.checkRevision(templateSpec.compiler);

        function invokePartialWrapper(partial, context, options) {
          if (options.hash) {
            context = Utils.extend({}, context, options.hash);
          }

          partial = env.VM.resolvePartial.call(this, partial, context, options);
          var result = env.VM.invokePartial.call(this, partial, context, options);

          if (result == null && env.compile) {
            options.partials[options.name] = env.compile(partial, templateSpec.compilerOptions, env);
            result = options.partials[options.name](context, options);
          }
          if (result != null) {
            if (options.indent) {
              var lines = result.split('\n');
              for (var i = 0, l = lines.length; i < l; i++) {
                if (!lines[i] && i + 1 === l) {
                  break;
                }

                lines[i] = options.indent + lines[i];
              }
              result = lines.join('\n');
            }
            return result;
          } else {
            throw new _Exception2['default']('The partial ' + options.name + ' could not be compiled when running in runtime-only mode');
          }
        }

        // Just add water
        var container = {
          strict: function strict(obj, name) {
            if (!(name in obj)) {
              throw new _Exception2['default']('"' + name + '" not defined in ' + obj);
            }
            return obj[name];
          },
          lookup: function lookup(depths, name) {
            var len = depths.length;
            for (var i = 0; i < len; i++) {
              if (depths[i] && depths[i][name] != null) {
                return depths[i][name];
              }
            }
          },
          lambda: function lambda(current, context) {
            return typeof current === 'function' ? current.call(context) : current;
          },

          escapeExpression: Utils.escapeExpression,
          invokePartial: invokePartialWrapper,

          fn: function fn(i) {
            return templateSpec[i];
          },

          programs: [],
          program: function program(i, data, declaredBlockParams, blockParams, depths) {
            var programWrapper = this.programs[i],
                fn = this.fn(i);
            if (data || depths || blockParams || declaredBlockParams) {
              programWrapper = wrapProgram(this, i, fn, data, declaredBlockParams, blockParams, depths);
            } else if (!programWrapper) {
              programWrapper = this.programs[i] = wrapProgram(this, i, fn);
            }
            return programWrapper;
          },

          data: function data(value, depth) {
            while (value && depth--) {
              value = value._parent;
            }
            return value;
          },
          merge: function merge(param, common) {
            var obj = param || common;

            if (param && common && param !== common) {
              obj = Utils.extend({}, common, param);
            }

            return obj;
          },

          noop: env.VM.noop,
          compilerInfo: templateSpec.compiler
        };

        function ret(context) {
          var options = arguments[1] === undefined ? {} : arguments[1];

          var data = options.data;

          ret._setup(options);
          if (!options.partial && templateSpec.useData) {
            data = initData(context, data);
          }
          var depths = undefined,
              blockParams = templateSpec.useBlockParams ? [] : undefined;
          if (templateSpec.useDepths) {
            depths = options.depths ? [context].concat(options.depths) : [context];
          }

          return templateSpec.main.call(container, context, container.helpers, container.partials, data, blockParams, depths);
        }
        ret.isTop = true;

        ret._setup = function (options) {
          if (!options.partial) {
            container.helpers = container.merge(options.helpers, env.helpers);

            if (templateSpec.usePartial) {
              container.partials = container.merge(options.partials, env.partials);
            }
          } else {
            container.helpers = options.helpers;
            container.partials = options.partials;
          }
        };

        ret._child = function (i, data, blockParams, depths) {
          if (templateSpec.useBlockParams && !blockParams) {
            throw new _Exception2['default']('must pass block params');
          }
          if (templateSpec.useDepths && !depths) {
            throw new _Exception2['default']('must pass parent depths');
          }

          return wrapProgram(container, i, templateSpec[i], data, 0, blockParams, depths);
        };
        return ret;
      }

      function wrapProgram(container, i, fn, data, declaredBlockParams, blockParams, depths) {
        function prog(context) {
          var options = arguments[1] === undefined ? {} : arguments[1];

          return fn.call(container, context, container.helpers, container.partials, options.data || data, blockParams && [options.blockParams].concat(blockParams), depths && [context].concat(depths));
        }
        prog.program = i;
        prog.depth = depths ? depths.length : 0;
        prog.blockParams = declaredBlockParams || 0;
        return prog;
      }

      function resolvePartial(partial, context, options) {
        if (!partial) {
          partial = options.partials[options.name];
        } else if (!partial.call && !options.name) {
          // This is a dynamic partial that returned a string
          options.name = partial;
          partial = options.partials[partial];
        }
        return partial;
      }

      function invokePartial(partial, context, options) {
        options.partial = true;

        if (partial === undefined) {
          throw new _Exception2['default']('The partial ' + options.name + ' could not be found');
        } else if (partial instanceof Function) {
          return partial(context, options);
        }
      }

      function noop() {
        return '';
      }

      function initData(context, data) {
        if (!data || !('root' in data)) {
          data = data ? _COMPILER_REVISION$REVISION_CHANGES$createFrame.createFrame(data) : {};
          data.root = context;
        }
        return data;
      }

      /***/ },
    /* 15 */
    /***/ function(module, exports, __webpack_require__) {

      "use strict";

      exports.__esModule = true;
      /* istanbul ignore next */
      /* Jison generated parser */
      var handlebars = (function () {
        var parser = { trace: function trace() {},
          yy: {},
          symbols_: { error: 2, root: 3, program: 4, EOF: 5, program_repetition0: 6, statement: 7, mustache: 8, block: 9, rawBlock: 10, partial: 11, content: 12, COMMENT: 13, CONTENT: 14, openRawBlock: 15, END_RAW_BLOCK: 16, OPEN_RAW_BLOCK: 17, helperName: 18, openRawBlock_repetition0: 19, openRawBlock_option0: 20, CLOSE_RAW_BLOCK: 21, openBlock: 22, block_option0: 23, closeBlock: 24, openInverse: 25, block_option1: 26, OPEN_BLOCK: 27, openBlock_repetition0: 28, openBlock_option0: 29, openBlock_option1: 30, CLOSE: 31, OPEN_INVERSE: 32, openInverse_repetition0: 33, openInverse_option0: 34, openInverse_option1: 35, openInverseChain: 36, OPEN_INVERSE_CHAIN: 37, openInverseChain_repetition0: 38, openInverseChain_option0: 39, openInverseChain_option1: 40, inverseAndProgram: 41, INVERSE: 42, inverseChain: 43, inverseChain_option0: 44, OPEN_ENDBLOCK: 45, OPEN: 46, mustache_repetition0: 47, mustache_option0: 48, OPEN_UNESCAPED: 49, mustache_repetition1: 50, mustache_option1: 51, CLOSE_UNESCAPED: 52, OPEN_PARTIAL: 53, partialName: 54, partial_repetition0: 55, partial_option0: 56, param: 57, sexpr: 58, OPEN_SEXPR: 59, sexpr_repetition0: 60, sexpr_option0: 61, CLOSE_SEXPR: 62, hash: 63, hash_repetition_plus0: 64, hashSegment: 65, ID: 66, EQUALS: 67, blockParams: 68, OPEN_BLOCK_PARAMS: 69, blockParams_repetition_plus0: 70, CLOSE_BLOCK_PARAMS: 71, path: 72, dataName: 73, STRING: 74, NUMBER: 75, BOOLEAN: 76, UNDEFINED: 77, NULL: 78, DATA: 79, pathSegments: 80, SEP: 81, $accept: 0, $end: 1 },
          terminals_: { 2: "error", 5: "EOF", 13: "COMMENT", 14: "CONTENT", 16: "END_RAW_BLOCK", 17: "OPEN_RAW_BLOCK", 21: "CLOSE_RAW_BLOCK", 27: "OPEN_BLOCK", 31: "CLOSE", 32: "OPEN_INVERSE", 37: "OPEN_INVERSE_CHAIN", 42: "INVERSE", 45: "OPEN_ENDBLOCK", 46: "OPEN", 49: "OPEN_UNESCAPED", 52: "CLOSE_UNESCAPED", 53: "OPEN_PARTIAL", 59: "OPEN_SEXPR", 62: "CLOSE_SEXPR", 66: "ID", 67: "EQUALS", 69: "OPEN_BLOCK_PARAMS", 71: "CLOSE_BLOCK_PARAMS", 74: "STRING", 75: "NUMBER", 76: "BOOLEAN", 77: "UNDEFINED", 78: "NULL", 79: "DATA", 81: "SEP" },
          productions_: [0, [3, 2], [4, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [12, 1], [10, 3], [15, 5], [9, 4], [9, 4], [22, 6], [25, 6], [36, 6], [41, 2], [43, 3], [43, 1], [24, 3], [8, 5], [8, 5], [11, 5], [57, 1], [57, 1], [58, 5], [63, 1], [65, 3], [68, 3], [18, 1], [18, 1], [18, 1], [18, 1], [18, 1], [18, 1], [18, 1], [54, 1], [54, 1], [73, 2], [72, 1], [80, 3], [80, 1], [6, 0], [6, 2], [19, 0], [19, 2], [20, 0], [20, 1], [23, 0], [23, 1], [26, 0], [26, 1], [28, 0], [28, 2], [29, 0], [29, 1], [30, 0], [30, 1], [33, 0], [33, 2], [34, 0], [34, 1], [35, 0], [35, 1], [38, 0], [38, 2], [39, 0], [39, 1], [40, 0], [40, 1], [44, 0], [44, 1], [47, 0], [47, 2], [48, 0], [48, 1], [50, 0], [50, 2], [51, 0], [51, 1], [55, 0], [55, 2], [56, 0], [56, 1], [60, 0], [60, 2], [61, 0], [61, 1], [64, 1], [64, 2], [70, 1], [70, 2]],
          performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$) {

            var $0 = $$.length - 1;
            switch (yystate) {
              case 1:
                return $$[$0 - 1];
                break;
              case 2:
                this.$ = new yy.Program($$[$0], null, {}, yy.locInfo(this._$));
                break;
              case 3:
                this.$ = $$[$0];
                break;
              case 4:
                this.$ = $$[$0];
                break;
              case 5:
                this.$ = $$[$0];
                break;
              case 6:
                this.$ = $$[$0];
                break;
              case 7:
                this.$ = $$[$0];
                break;
              case 8:
                this.$ = new yy.CommentStatement(yy.stripComment($$[$0]), yy.stripFlags($$[$0], $$[$0]), yy.locInfo(this._$));
                break;
              case 9:
                this.$ = new yy.ContentStatement($$[$0], yy.locInfo(this._$));
                break;
              case 10:
                this.$ = yy.prepareRawBlock($$[$0 - 2], $$[$0 - 1], $$[$0], this._$);
                break;
              case 11:
                this.$ = { path: $$[$0 - 3], params: $$[$0 - 2], hash: $$[$0 - 1] };
                break;
              case 12:
                this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], false, this._$);
                break;
              case 13:
                this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], true, this._$);
                break;
              case 14:
                this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
                break;
              case 15:
                this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
                break;
              case 16:
                this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
                break;
              case 17:
                this.$ = { strip: yy.stripFlags($$[$0 - 1], $$[$0 - 1]), program: $$[$0] };
                break;
              case 18:
                var inverse = yy.prepareBlock($$[$0 - 2], $$[$0 - 1], $$[$0], $$[$0], false, this._$),
                    program = new yy.Program([inverse], null, {}, yy.locInfo(this._$));
                program.chained = true;

                this.$ = { strip: $$[$0 - 2].strip, program: program, chain: true };

                break;
              case 19:
                this.$ = $$[$0];
                break;
              case 20:
                this.$ = { path: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 2], $$[$0]) };
                break;
              case 21:
                this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
                break;
              case 22:
                this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
                break;
              case 23:
                this.$ = new yy.PartialStatement($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], yy.stripFlags($$[$0 - 4], $$[$0]), yy.locInfo(this._$));
                break;
              case 24:
                this.$ = $$[$0];
                break;
              case 25:
                this.$ = $$[$0];
                break;
              case 26:
                this.$ = new yy.SubExpression($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], yy.locInfo(this._$));
                break;
              case 27:
                this.$ = new yy.Hash($$[$0], yy.locInfo(this._$));
                break;
              case 28:
                this.$ = new yy.HashPair(yy.id($$[$0 - 2]), $$[$0], yy.locInfo(this._$));
                break;
              case 29:
                this.$ = yy.id($$[$0 - 1]);
                break;
              case 30:
                this.$ = $$[$0];
                break;
              case 31:
                this.$ = $$[$0];
                break;
              case 32:
                this.$ = new yy.StringLiteral($$[$0], yy.locInfo(this._$));
                break;
              case 33:
                this.$ = new yy.NumberLiteral($$[$0], yy.locInfo(this._$));
                break;
              case 34:
                this.$ = new yy.BooleanLiteral($$[$0], yy.locInfo(this._$));
                break;
              case 35:
                this.$ = new yy.UndefinedLiteral(yy.locInfo(this._$));
                break;
              case 36:
                this.$ = new yy.NullLiteral(yy.locInfo(this._$));
                break;
              case 37:
                this.$ = $$[$0];
                break;
              case 38:
                this.$ = $$[$0];
                break;
              case 39:
                this.$ = yy.preparePath(true, $$[$0], this._$);
                break;
              case 40:
                this.$ = yy.preparePath(false, $$[$0], this._$);
                break;
              case 41:
                $$[$0 - 2].push({ part: yy.id($$[$0]), original: $$[$0], separator: $$[$0 - 1] });this.$ = $$[$0 - 2];
                break;
              case 42:
                this.$ = [{ part: yy.id($$[$0]), original: $$[$0] }];
                break;
              case 43:
                this.$ = [];
                break;
              case 44:
                $$[$0 - 1].push($$[$0]);
                break;
              case 45:
                this.$ = [];
                break;
              case 46:
                $$[$0 - 1].push($$[$0]);
                break;
              case 53:
                this.$ = [];
                break;
              case 54:
                $$[$0 - 1].push($$[$0]);
                break;
              case 59:
                this.$ = [];
                break;
              case 60:
                $$[$0 - 1].push($$[$0]);
                break;
              case 65:
                this.$ = [];
                break;
              case 66:
                $$[$0 - 1].push($$[$0]);
                break;
              case 73:
                this.$ = [];
                break;
              case 74:
                $$[$0 - 1].push($$[$0]);
                break;
              case 77:
                this.$ = [];
                break;
              case 78:
                $$[$0 - 1].push($$[$0]);
                break;
              case 81:
                this.$ = [];
                break;
              case 82:
                $$[$0 - 1].push($$[$0]);
                break;
              case 85:
                this.$ = [];
                break;
              case 86:
                $$[$0 - 1].push($$[$0]);
                break;
              case 89:
                this.$ = [$$[$0]];
                break;
              case 90:
                $$[$0 - 1].push($$[$0]);
                break;
              case 91:
                this.$ = [$$[$0]];
                break;
              case 92:
                $$[$0 - 1].push($$[$0]);
                break;
            }
          },
          table: [{ 3: 1, 4: 2, 5: [2, 43], 6: 3, 13: [2, 43], 14: [2, 43], 17: [2, 43], 27: [2, 43], 32: [2, 43], 46: [2, 43], 49: [2, 43], 53: [2, 43] }, { 1: [3] }, { 5: [1, 4] }, { 5: [2, 2], 7: 5, 8: 6, 9: 7, 10: 8, 11: 9, 12: 10, 13: [1, 11], 14: [1, 18], 15: 16, 17: [1, 21], 22: 14, 25: 15, 27: [1, 19], 32: [1, 20], 37: [2, 2], 42: [2, 2], 45: [2, 2], 46: [1, 12], 49: [1, 13], 53: [1, 17] }, { 1: [2, 1] }, { 5: [2, 44], 13: [2, 44], 14: [2, 44], 17: [2, 44], 27: [2, 44], 32: [2, 44], 37: [2, 44], 42: [2, 44], 45: [2, 44], 46: [2, 44], 49: [2, 44], 53: [2, 44] }, { 5: [2, 3], 13: [2, 3], 14: [2, 3], 17: [2, 3], 27: [2, 3], 32: [2, 3], 37: [2, 3], 42: [2, 3], 45: [2, 3], 46: [2, 3], 49: [2, 3], 53: [2, 3] }, { 5: [2, 4], 13: [2, 4], 14: [2, 4], 17: [2, 4], 27: [2, 4], 32: [2, 4], 37: [2, 4], 42: [2, 4], 45: [2, 4], 46: [2, 4], 49: [2, 4], 53: [2, 4] }, { 5: [2, 5], 13: [2, 5], 14: [2, 5], 17: [2, 5], 27: [2, 5], 32: [2, 5], 37: [2, 5], 42: [2, 5], 45: [2, 5], 46: [2, 5], 49: [2, 5], 53: [2, 5] }, { 5: [2, 6], 13: [2, 6], 14: [2, 6], 17: [2, 6], 27: [2, 6], 32: [2, 6], 37: [2, 6], 42: [2, 6], 45: [2, 6], 46: [2, 6], 49: [2, 6], 53: [2, 6] }, { 5: [2, 7], 13: [2, 7], 14: [2, 7], 17: [2, 7], 27: [2, 7], 32: [2, 7], 37: [2, 7], 42: [2, 7], 45: [2, 7], 46: [2, 7], 49: [2, 7], 53: [2, 7] }, { 5: [2, 8], 13: [2, 8], 14: [2, 8], 17: [2, 8], 27: [2, 8], 32: [2, 8], 37: [2, 8], 42: [2, 8], 45: [2, 8], 46: [2, 8], 49: [2, 8], 53: [2, 8] }, { 18: 22, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 18: 33, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 4: 34, 6: 3, 13: [2, 43], 14: [2, 43], 17: [2, 43], 27: [2, 43], 32: [2, 43], 37: [2, 43], 42: [2, 43], 45: [2, 43], 46: [2, 43], 49: [2, 43], 53: [2, 43] }, { 4: 35, 6: 3, 13: [2, 43], 14: [2, 43], 17: [2, 43], 27: [2, 43], 32: [2, 43], 42: [2, 43], 45: [2, 43], 46: [2, 43], 49: [2, 43], 53: [2, 43] }, { 12: 36, 14: [1, 18] }, { 18: 38, 54: 37, 58: 39, 59: [1, 40], 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 5: [2, 9], 13: [2, 9], 14: [2, 9], 16: [2, 9], 17: [2, 9], 27: [2, 9], 32: [2, 9], 37: [2, 9], 42: [2, 9], 45: [2, 9], 46: [2, 9], 49: [2, 9], 53: [2, 9] }, { 18: 41, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 18: 42, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 18: 43, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 31: [2, 73], 47: 44, 59: [2, 73], 66: [2, 73], 74: [2, 73], 75: [2, 73], 76: [2, 73], 77: [2, 73], 78: [2, 73], 79: [2, 73] }, { 21: [2, 30], 31: [2, 30], 52: [2, 30], 59: [2, 30], 62: [2, 30], 66: [2, 30], 69: [2, 30], 74: [2, 30], 75: [2, 30], 76: [2, 30], 77: [2, 30], 78: [2, 30], 79: [2, 30] }, { 21: [2, 31], 31: [2, 31], 52: [2, 31], 59: [2, 31], 62: [2, 31], 66: [2, 31], 69: [2, 31], 74: [2, 31], 75: [2, 31], 76: [2, 31], 77: [2, 31], 78: [2, 31], 79: [2, 31] }, { 21: [2, 32], 31: [2, 32], 52: [2, 32], 59: [2, 32], 62: [2, 32], 66: [2, 32], 69: [2, 32], 74: [2, 32], 75: [2, 32], 76: [2, 32], 77: [2, 32], 78: [2, 32], 79: [2, 32] }, { 21: [2, 33], 31: [2, 33], 52: [2, 33], 59: [2, 33], 62: [2, 33], 66: [2, 33], 69: [2, 33], 74: [2, 33], 75: [2, 33], 76: [2, 33], 77: [2, 33], 78: [2, 33], 79: [2, 33] }, { 21: [2, 34], 31: [2, 34], 52: [2, 34], 59: [2, 34], 62: [2, 34], 66: [2, 34], 69: [2, 34], 74: [2, 34], 75: [2, 34], 76: [2, 34], 77: [2, 34], 78: [2, 34], 79: [2, 34] }, { 21: [2, 35], 31: [2, 35], 52: [2, 35], 59: [2, 35], 62: [2, 35], 66: [2, 35], 69: [2, 35], 74: [2, 35], 75: [2, 35], 76: [2, 35], 77: [2, 35], 78: [2, 35], 79: [2, 35] }, { 21: [2, 36], 31: [2, 36], 52: [2, 36], 59: [2, 36], 62: [2, 36], 66: [2, 36], 69: [2, 36], 74: [2, 36], 75: [2, 36], 76: [2, 36], 77: [2, 36], 78: [2, 36], 79: [2, 36] }, { 21: [2, 40], 31: [2, 40], 52: [2, 40], 59: [2, 40], 62: [2, 40], 66: [2, 40], 69: [2, 40], 74: [2, 40], 75: [2, 40], 76: [2, 40], 77: [2, 40], 78: [2, 40], 79: [2, 40], 81: [1, 45] }, { 66: [1, 32], 80: 46 }, { 21: [2, 42], 31: [2, 42], 52: [2, 42], 59: [2, 42], 62: [2, 42], 66: [2, 42], 69: [2, 42], 74: [2, 42], 75: [2, 42], 76: [2, 42], 77: [2, 42], 78: [2, 42], 79: [2, 42], 81: [2, 42] }, { 50: 47, 52: [2, 77], 59: [2, 77], 66: [2, 77], 74: [2, 77], 75: [2, 77], 76: [2, 77], 77: [2, 77], 78: [2, 77], 79: [2, 77] }, { 23: 48, 36: 50, 37: [1, 52], 41: 51, 42: [1, 53], 43: 49, 45: [2, 49] }, { 26: 54, 41: 55, 42: [1, 53], 45: [2, 51] }, { 16: [1, 56] }, { 31: [2, 81], 55: 57, 59: [2, 81], 66: [2, 81], 74: [2, 81], 75: [2, 81], 76: [2, 81], 77: [2, 81], 78: [2, 81], 79: [2, 81] }, { 31: [2, 37], 59: [2, 37], 66: [2, 37], 74: [2, 37], 75: [2, 37], 76: [2, 37], 77: [2, 37], 78: [2, 37], 79: [2, 37] }, { 31: [2, 38], 59: [2, 38], 66: [2, 38], 74: [2, 38], 75: [2, 38], 76: [2, 38], 77: [2, 38], 78: [2, 38], 79: [2, 38] }, { 18: 58, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 28: 59, 31: [2, 53], 59: [2, 53], 66: [2, 53], 69: [2, 53], 74: [2, 53], 75: [2, 53], 76: [2, 53], 77: [2, 53], 78: [2, 53], 79: [2, 53] }, { 31: [2, 59], 33: 60, 59: [2, 59], 66: [2, 59], 69: [2, 59], 74: [2, 59], 75: [2, 59], 76: [2, 59], 77: [2, 59], 78: [2, 59], 79: [2, 59] }, { 19: 61, 21: [2, 45], 59: [2, 45], 66: [2, 45], 74: [2, 45], 75: [2, 45], 76: [2, 45], 77: [2, 45], 78: [2, 45], 79: [2, 45] }, { 18: 65, 31: [2, 75], 48: 62, 57: 63, 58: 66, 59: [1, 40], 63: 64, 64: 67, 65: 68, 66: [1, 69], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 66: [1, 70] }, { 21: [2, 39], 31: [2, 39], 52: [2, 39], 59: [2, 39], 62: [2, 39], 66: [2, 39], 69: [2, 39], 74: [2, 39], 75: [2, 39], 76: [2, 39], 77: [2, 39], 78: [2, 39], 79: [2, 39], 81: [1, 45] }, { 18: 65, 51: 71, 52: [2, 79], 57: 72, 58: 66, 59: [1, 40], 63: 73, 64: 67, 65: 68, 66: [1, 69], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 24: 74, 45: [1, 75] }, { 45: [2, 50] }, { 4: 76, 6: 3, 13: [2, 43], 14: [2, 43], 17: [2, 43], 27: [2, 43], 32: [2, 43], 37: [2, 43], 42: [2, 43], 45: [2, 43], 46: [2, 43], 49: [2, 43], 53: [2, 43] }, { 45: [2, 19] }, { 18: 77, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 4: 78, 6: 3, 13: [2, 43], 14: [2, 43], 17: [2, 43], 27: [2, 43], 32: [2, 43], 45: [2, 43], 46: [2, 43], 49: [2, 43], 53: [2, 43] }, { 24: 79, 45: [1, 75] }, { 45: [2, 52] }, { 5: [2, 10], 13: [2, 10], 14: [2, 10], 17: [2, 10], 27: [2, 10], 32: [2, 10], 37: [2, 10], 42: [2, 10], 45: [2, 10], 46: [2, 10], 49: [2, 10], 53: [2, 10] }, { 18: 65, 31: [2, 83], 56: 80, 57: 81, 58: 66, 59: [1, 40], 63: 82, 64: 67, 65: 68, 66: [1, 69], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 59: [2, 85], 60: 83, 62: [2, 85], 66: [2, 85], 74: [2, 85], 75: [2, 85], 76: [2, 85], 77: [2, 85], 78: [2, 85], 79: [2, 85] }, { 18: 65, 29: 84, 31: [2, 55], 57: 85, 58: 66, 59: [1, 40], 63: 86, 64: 67, 65: 68, 66: [1, 69], 69: [2, 55], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 18: 65, 31: [2, 61], 34: 87, 57: 88, 58: 66, 59: [1, 40], 63: 89, 64: 67, 65: 68, 66: [1, 69], 69: [2, 61], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 18: 65, 20: 90, 21: [2, 47], 57: 91, 58: 66, 59: [1, 40], 63: 92, 64: 67, 65: 68, 66: [1, 69], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 31: [1, 93] }, { 31: [2, 74], 59: [2, 74], 66: [2, 74], 74: [2, 74], 75: [2, 74], 76: [2, 74], 77: [2, 74], 78: [2, 74], 79: [2, 74] }, { 31: [2, 76] }, { 21: [2, 24], 31: [2, 24], 52: [2, 24], 59: [2, 24], 62: [2, 24], 66: [2, 24], 69: [2, 24], 74: [2, 24], 75: [2, 24], 76: [2, 24], 77: [2, 24], 78: [2, 24], 79: [2, 24] }, { 21: [2, 25], 31: [2, 25], 52: [2, 25], 59: [2, 25], 62: [2, 25], 66: [2, 25], 69: [2, 25], 74: [2, 25], 75: [2, 25], 76: [2, 25], 77: [2, 25], 78: [2, 25], 79: [2, 25] }, { 21: [2, 27], 31: [2, 27], 52: [2, 27], 62: [2, 27], 65: 94, 66: [1, 95], 69: [2, 27] }, { 21: [2, 89], 31: [2, 89], 52: [2, 89], 62: [2, 89], 66: [2, 89], 69: [2, 89] }, { 21: [2, 42], 31: [2, 42], 52: [2, 42], 59: [2, 42], 62: [2, 42], 66: [2, 42], 67: [1, 96], 69: [2, 42], 74: [2, 42], 75: [2, 42], 76: [2, 42], 77: [2, 42], 78: [2, 42], 79: [2, 42], 81: [2, 42] }, { 21: [2, 41], 31: [2, 41], 52: [2, 41], 59: [2, 41], 62: [2, 41], 66: [2, 41], 69: [2, 41], 74: [2, 41], 75: [2, 41], 76: [2, 41], 77: [2, 41], 78: [2, 41], 79: [2, 41], 81: [2, 41] }, { 52: [1, 97] }, { 52: [2, 78], 59: [2, 78], 66: [2, 78], 74: [2, 78], 75: [2, 78], 76: [2, 78], 77: [2, 78], 78: [2, 78], 79: [2, 78] }, { 52: [2, 80] }, { 5: [2, 12], 13: [2, 12], 14: [2, 12], 17: [2, 12], 27: [2, 12], 32: [2, 12], 37: [2, 12], 42: [2, 12], 45: [2, 12], 46: [2, 12], 49: [2, 12], 53: [2, 12] }, { 18: 98, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 36: 50, 37: [1, 52], 41: 51, 42: [1, 53], 43: 100, 44: 99, 45: [2, 71] }, { 31: [2, 65], 38: 101, 59: [2, 65], 66: [2, 65], 69: [2, 65], 74: [2, 65], 75: [2, 65], 76: [2, 65], 77: [2, 65], 78: [2, 65], 79: [2, 65] }, { 45: [2, 17] }, { 5: [2, 13], 13: [2, 13], 14: [2, 13], 17: [2, 13], 27: [2, 13], 32: [2, 13], 37: [2, 13], 42: [2, 13], 45: [2, 13], 46: [2, 13], 49: [2, 13], 53: [2, 13] }, { 31: [1, 102] }, { 31: [2, 82], 59: [2, 82], 66: [2, 82], 74: [2, 82], 75: [2, 82], 76: [2, 82], 77: [2, 82], 78: [2, 82], 79: [2, 82] }, { 31: [2, 84] }, { 18: 65, 57: 104, 58: 66, 59: [1, 40], 61: 103, 62: [2, 87], 63: 105, 64: 67, 65: 68, 66: [1, 69], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 30: 106, 31: [2, 57], 68: 107, 69: [1, 108] }, { 31: [2, 54], 59: [2, 54], 66: [2, 54], 69: [2, 54], 74: [2, 54], 75: [2, 54], 76: [2, 54], 77: [2, 54], 78: [2, 54], 79: [2, 54] }, { 31: [2, 56], 69: [2, 56] }, { 31: [2, 63], 35: 109, 68: 110, 69: [1, 108] }, { 31: [2, 60], 59: [2, 60], 66: [2, 60], 69: [2, 60], 74: [2, 60], 75: [2, 60], 76: [2, 60], 77: [2, 60], 78: [2, 60], 79: [2, 60] }, { 31: [2, 62], 69: [2, 62] }, { 21: [1, 111] }, { 21: [2, 46], 59: [2, 46], 66: [2, 46], 74: [2, 46], 75: [2, 46], 76: [2, 46], 77: [2, 46], 78: [2, 46], 79: [2, 46] }, { 21: [2, 48] }, { 5: [2, 21], 13: [2, 21], 14: [2, 21], 17: [2, 21], 27: [2, 21], 32: [2, 21], 37: [2, 21], 42: [2, 21], 45: [2, 21], 46: [2, 21], 49: [2, 21], 53: [2, 21] }, { 21: [2, 90], 31: [2, 90], 52: [2, 90], 62: [2, 90], 66: [2, 90], 69: [2, 90] }, { 67: [1, 96] }, { 18: 65, 57: 112, 58: 66, 59: [1, 40], 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 5: [2, 22], 13: [2, 22], 14: [2, 22], 17: [2, 22], 27: [2, 22], 32: [2, 22], 37: [2, 22], 42: [2, 22], 45: [2, 22], 46: [2, 22], 49: [2, 22], 53: [2, 22] }, { 31: [1, 113] }, { 45: [2, 18] }, { 45: [2, 72] }, { 18: 65, 31: [2, 67], 39: 114, 57: 115, 58: 66, 59: [1, 40], 63: 116, 64: 67, 65: 68, 66: [1, 69], 69: [2, 67], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 5: [2, 23], 13: [2, 23], 14: [2, 23], 17: [2, 23], 27: [2, 23], 32: [2, 23], 37: [2, 23], 42: [2, 23], 45: [2, 23], 46: [2, 23], 49: [2, 23], 53: [2, 23] }, { 62: [1, 117] }, { 59: [2, 86], 62: [2, 86], 66: [2, 86], 74: [2, 86], 75: [2, 86], 76: [2, 86], 77: [2, 86], 78: [2, 86], 79: [2, 86] }, { 62: [2, 88] }, { 31: [1, 118] }, { 31: [2, 58] }, { 66: [1, 120], 70: 119 }, { 31: [1, 121] }, { 31: [2, 64] }, { 14: [2, 11] }, { 21: [2, 28], 31: [2, 28], 52: [2, 28], 62: [2, 28], 66: [2, 28], 69: [2, 28] }, { 5: [2, 20], 13: [2, 20], 14: [2, 20], 17: [2, 20], 27: [2, 20], 32: [2, 20], 37: [2, 20], 42: [2, 20], 45: [2, 20], 46: [2, 20], 49: [2, 20], 53: [2, 20] }, { 31: [2, 69], 40: 122, 68: 123, 69: [1, 108] }, { 31: [2, 66], 59: [2, 66], 66: [2, 66], 69: [2, 66], 74: [2, 66], 75: [2, 66], 76: [2, 66], 77: [2, 66], 78: [2, 66], 79: [2, 66] }, { 31: [2, 68], 69: [2, 68] }, { 21: [2, 26], 31: [2, 26], 52: [2, 26], 59: [2, 26], 62: [2, 26], 66: [2, 26], 69: [2, 26], 74: [2, 26], 75: [2, 26], 76: [2, 26], 77: [2, 26], 78: [2, 26], 79: [2, 26] }, { 13: [2, 14], 14: [2, 14], 17: [2, 14], 27: [2, 14], 32: [2, 14], 37: [2, 14], 42: [2, 14], 45: [2, 14], 46: [2, 14], 49: [2, 14], 53: [2, 14] }, { 66: [1, 125], 71: [1, 124] }, { 66: [2, 91], 71: [2, 91] }, { 13: [2, 15], 14: [2, 15], 17: [2, 15], 27: [2, 15], 32: [2, 15], 42: [2, 15], 45: [2, 15], 46: [2, 15], 49: [2, 15], 53: [2, 15] }, { 31: [1, 126] }, { 31: [2, 70] }, { 31: [2, 29] }, { 66: [2, 92], 71: [2, 92] }, { 13: [2, 16], 14: [2, 16], 17: [2, 16], 27: [2, 16], 32: [2, 16], 37: [2, 16], 42: [2, 16], 45: [2, 16], 46: [2, 16], 49: [2, 16], 53: [2, 16] }],
          defaultActions: { 4: [2, 1], 49: [2, 50], 51: [2, 19], 55: [2, 52], 64: [2, 76], 73: [2, 80], 78: [2, 17], 82: [2, 84], 92: [2, 48], 99: [2, 18], 100: [2, 72], 105: [2, 88], 107: [2, 58], 110: [2, 64], 111: [2, 11], 123: [2, 70], 124: [2, 29] },
          parseError: function parseError(str, hash) {
            throw new Error(str);
          },
          parse: function parse(input) {
            var self = this,
                stack = [0],
                vstack = [null],
                lstack = [],
                table = this.table,
                yytext = "",
                yylineno = 0,
                yyleng = 0,
                recovering = 0,
                TERROR = 2,
                EOF = 1;
            this.lexer.setInput(input);
            this.lexer.yy = this.yy;
            this.yy.lexer = this.lexer;
            this.yy.parser = this;
            if (typeof this.lexer.yylloc == "undefined") this.lexer.yylloc = {};
            var yyloc = this.lexer.yylloc;
            lstack.push(yyloc);
            var ranges = this.lexer.options && this.lexer.options.ranges;
            if (typeof this.yy.parseError === "function") this.parseError = this.yy.parseError;
            function popStack(n) {
              stack.length = stack.length - 2 * n;
              vstack.length = vstack.length - n;
              lstack.length = lstack.length - n;
            }
            function lex() {
              var token;
              token = self.lexer.lex() || 1;
              if (typeof token !== "number") {
                token = self.symbols_[token] || token;
              }
              return token;
            }
            var symbol,
                preErrorSymbol,
                state,
                action,
                a,
                r,
                yyval = {},
                p,
                len,
                newState,
                expected;
            while (true) {
              state = stack[stack.length - 1];
              if (this.defaultActions[state]) {
                action = this.defaultActions[state];
              } else {
                if (symbol === null || typeof symbol == "undefined") {
                  symbol = lex();
                }
                action = table[state] && table[state][symbol];
              }
              if (typeof action === "undefined" || !action.length || !action[0]) {
                var errStr = "";
                if (!recovering) {
                  expected = [];
                  for (p in table[state]) if (this.terminals_[p] && p > 2) {
                    expected.push("'" + this.terminals_[p] + "'");
                  }
                  if (this.lexer.showPosition) {
                    errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                  } else {
                    errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1 ? "end of input" : "'" + (this.terminals_[symbol] || symbol) + "'");
                  }
                  this.parseError(errStr, { text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected });
                }
              }
              if (action[0] instanceof Array && action.length > 1) {
                throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
              }
              switch (action[0]) {
                case 1:
                  stack.push(symbol);
                  vstack.push(this.lexer.yytext);
                  lstack.push(this.lexer.yylloc);
                  stack.push(action[1]);
                  symbol = null;
                  if (!preErrorSymbol) {
                    yyleng = this.lexer.yyleng;
                    yytext = this.lexer.yytext;
                    yylineno = this.lexer.yylineno;
                    yyloc = this.lexer.yylloc;
                    if (recovering > 0) recovering--;
                  } else {
                    symbol = preErrorSymbol;
                    preErrorSymbol = null;
                  }
                  break;
                case 2:
                  len = this.productions_[action[1]][1];
                  yyval.$ = vstack[vstack.length - len];
                  yyval._$ = { first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column };
                  if (ranges) {
                    yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
                  }
                  r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
                  if (typeof r !== "undefined") {
                    return r;
                  }
                  if (len) {
                    stack = stack.slice(0, -1 * len * 2);
                    vstack = vstack.slice(0, -1 * len);
                    lstack = lstack.slice(0, -1 * len);
                  }
                  stack.push(this.productions_[action[1]][0]);
                  vstack.push(yyval.$);
                  lstack.push(yyval._$);
                  newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
                  stack.push(newState);
                  break;
                case 3:
                  return true;
              }
            }
            return true;
          }
        };
        /* Jison generated lexer */
        var lexer = (function () {
          var lexer = { EOF: 1,
            parseError: function parseError(str, hash) {
              if (this.yy.parser) {
                this.yy.parser.parseError(str, hash);
              } else {
                throw new Error(str);
              }
            },
            setInput: function setInput(input) {
              this._input = input;
              this._more = this._less = this.done = false;
              this.yylineno = this.yyleng = 0;
              this.yytext = this.matched = this.match = "";
              this.conditionStack = ["INITIAL"];
              this.yylloc = { first_line: 1, first_column: 0, last_line: 1, last_column: 0 };
              if (this.options.ranges) this.yylloc.range = [0, 0];
              this.offset = 0;
              return this;
            },
            input: function input() {
              var ch = this._input[0];
              this.yytext += ch;
              this.yyleng++;
              this.offset++;
              this.match += ch;
              this.matched += ch;
              var lines = ch.match(/(?:\r\n?|\n).*/g);
              if (lines) {
                this.yylineno++;
                this.yylloc.last_line++;
              } else {
                this.yylloc.last_column++;
              }
              if (this.options.ranges) this.yylloc.range[1]++;

              this._input = this._input.slice(1);
              return ch;
            },
            unput: function unput(ch) {
              var len = ch.length;
              var lines = ch.split(/(?:\r\n?|\n)/g);

              this._input = ch + this._input;
              this.yytext = this.yytext.substr(0, this.yytext.length - len - 1);
              //this.yyleng -= len;
              this.offset -= len;
              var oldLines = this.match.split(/(?:\r\n?|\n)/g);
              this.match = this.match.substr(0, this.match.length - 1);
              this.matched = this.matched.substr(0, this.matched.length - 1);

              if (lines.length - 1) this.yylineno -= lines.length - 1;
              var r = this.yylloc.range;

              this.yylloc = { first_line: this.yylloc.first_line,
                last_line: this.yylineno + 1,
                first_column: this.yylloc.first_column,
                last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len
              };

              if (this.options.ranges) {
                this.yylloc.range = [r[0], r[0] + this.yyleng - len];
              }
              return this;
            },
            more: function more() {
              this._more = true;
              return this;
            },
            less: function less(n) {
              this.unput(this.match.slice(n));
            },
            pastInput: function pastInput() {
              var past = this.matched.substr(0, this.matched.length - this.match.length);
              return (past.length > 20 ? "..." : "") + past.substr(-20).replace(/\n/g, "");
            },
            upcomingInput: function upcomingInput() {
              var next = this.match;
              if (next.length < 20) {
                next += this._input.substr(0, 20 - next.length);
              }
              return (next.substr(0, 20) + (next.length > 20 ? "..." : "")).replace(/\n/g, "");
            },
            showPosition: function showPosition() {
              var pre = this.pastInput();
              var c = new Array(pre.length + 1).join("-");
              return pre + this.upcomingInput() + "\n" + c + "^";
            },
            next: function next() {
              if (this.done) {
                return this.EOF;
              }
              if (!this._input) this.done = true;

              var token, match, tempMatch, index, col, lines;
              if (!this._more) {
                this.yytext = "";
                this.match = "";
              }
              var rules = this._currentRules();
              for (var i = 0; i < rules.length; i++) {
                tempMatch = this._input.match(this.rules[rules[i]]);
                if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                  match = tempMatch;
                  index = i;
                  if (!this.options.flex) break;
                }
              }
              if (match) {
                lines = match[0].match(/(?:\r\n?|\n).*/g);
                if (lines) this.yylineno += lines.length;
                this.yylloc = { first_line: this.yylloc.last_line,
                  last_line: this.yylineno + 1,
                  first_column: this.yylloc.last_column,
                  last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length };
                this.yytext += match[0];
                this.match += match[0];
                this.matches = match;
                this.yyleng = this.yytext.length;
                if (this.options.ranges) {
                  this.yylloc.range = [this.offset, this.offset += this.yyleng];
                }
                this._more = false;
                this._input = this._input.slice(match[0].length);
                this.matched += match[0];
                token = this.performAction.call(this, this.yy, this, rules[index], this.conditionStack[this.conditionStack.length - 1]);
                if (this.done && this._input) this.done = false;
                if (token) {
                  return token;
                } else {
                  return;
                }
              }
              if (this._input === "") {
                return this.EOF;
              } else {
                return this.parseError("Lexical error on line " + (this.yylineno + 1) + ". Unrecognized text.\n" + this.showPosition(), { text: "", token: null, line: this.yylineno });
              }
            },
            lex: function lex() {
              var r = this.next();
              if (typeof r !== "undefined") {
                return r;
              } else {
                return this.lex();
              }
            },
            begin: function begin(condition) {
              this.conditionStack.push(condition);
            },
            popState: function popState() {
              return this.conditionStack.pop();
            },
            _currentRules: function _currentRules() {
              return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
            },
            topState: function topState() {
              return this.conditionStack[this.conditionStack.length - 2];
            },
            pushState: function begin(condition) {
              this.begin(condition);
            } };
          lexer.options = {};
          lexer.performAction = function anonymous(yy, yy_, $avoiding_name_collisions, YY_START) {

            function strip(start, end) {
              return yy_.yytext = yy_.yytext.substr(start, yy_.yyleng - end);
            }

            var YYSTATE = YY_START;
            switch ($avoiding_name_collisions) {
              case 0:
                if (yy_.yytext.slice(-2) === "\\\\") {
                  strip(0, 1);
                  this.begin("mu");
                } else if (yy_.yytext.slice(-1) === "\\") {
                  strip(0, 1);
                  this.begin("emu");
                } else {
                  this.begin("mu");
                }
                if (yy_.yytext) {
                  return 14;
                }break;
              case 1:
                return 14;
                break;
              case 2:
                this.popState();
                return 14;

                break;
              case 3:
                yy_.yytext = yy_.yytext.substr(5, yy_.yyleng - 9);
                this.popState();
                return 16;

                break;
              case 4:
                return 14;
                break;
              case 5:
                this.popState();
                return 13;

                break;
              case 6:
                return 59;
                break;
              case 7:
                return 62;
                break;
              case 8:
                return 17;
                break;
              case 9:
                this.popState();
                this.begin("raw");
                return 21;

                break;
              case 10:
                return 53;
                break;
              case 11:
                return 27;
                break;
              case 12:
                return 45;
                break;
              case 13:
                this.popState();return 42;
                break;
              case 14:
                this.popState();return 42;
                break;
              case 15:
                return 32;
                break;
              case 16:
                return 37;
                break;
              case 17:
                return 49;
                break;
              case 18:
                return 46;
                break;
              case 19:
                this.unput(yy_.yytext);
                this.popState();
                this.begin("com");

                break;
              case 20:
                this.popState();
                return 13;

                break;
              case 21:
                return 46;
                break;
              case 22:
                return 67;
                break;
              case 23:
                return 66;
                break;
              case 24:
                return 66;
                break;
              case 25:
                return 81;
                break;
              case 26:
                // ignore whitespace
                break;
              case 27:
                this.popState();return 52;
                break;
              case 28:
                this.popState();return 31;
                break;
              case 29:
                yy_.yytext = strip(1, 2).replace(/\\"/g, "\"");return 74;
                break;
              case 30:
                yy_.yytext = strip(1, 2).replace(/\\'/g, "'");return 74;
                break;
              case 31:
                return 79;
                break;
              case 32:
                return 76;
                break;
              case 33:
                return 76;
                break;
              case 34:
                return 77;
                break;
              case 35:
                return 78;
                break;
              case 36:
                return 75;
                break;
              case 37:
                return 69;
                break;
              case 38:
                return 71;
                break;
              case 39:
                return 66;
                break;
              case 40:
                return 66;
                break;
              case 41:
                return "INVALID";
                break;
              case 42:
                return 5;
                break;
            }
          };
          lexer.rules = [/^(?:[^\x00]*?(?=(\{\{)))/, /^(?:[^\x00]+)/, /^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/, /^(?:\{\{\{\{\/[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.])\}\}\}\})/, /^(?:[^\x00]*?(?=(\{\{\{\{\/)))/, /^(?:[\s\S]*?--(~)?\}\})/, /^(?:\()/, /^(?:\))/, /^(?:\{\{\{\{)/, /^(?:\}\}\}\})/, /^(?:\{\{(~)?>)/, /^(?:\{\{(~)?#)/, /^(?:\{\{(~)?\/)/, /^(?:\{\{(~)?\^\s*(~)?\}\})/, /^(?:\{\{(~)?\s*else\s*(~)?\}\})/, /^(?:\{\{(~)?\^)/, /^(?:\{\{(~)?\s*else\b)/, /^(?:\{\{(~)?\{)/, /^(?:\{\{(~)?&)/, /^(?:\{\{(~)?!--)/, /^(?:\{\{(~)?![\s\S]*?\}\})/, /^(?:\{\{(~)?)/, /^(?:=)/, /^(?:\.\.)/, /^(?:\.(?=([=~}\s\/.)|])))/, /^(?:[\/.])/, /^(?:\s+)/, /^(?:\}(~)?\}\})/, /^(?:(~)?\}\})/, /^(?:"(\\["]|[^"])*")/, /^(?:'(\\[']|[^'])*')/, /^(?:@)/, /^(?:true(?=([~}\s)])))/, /^(?:false(?=([~}\s)])))/, /^(?:undefined(?=([~}\s)])))/, /^(?:null(?=([~}\s)])))/, /^(?:-?[0-9]+(?:\.[0-9]+)?(?=([~}\s)])))/, /^(?:as\s+\|)/, /^(?:\|)/, /^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)|]))))/, /^(?:\[[^\]]*\])/, /^(?:.)/, /^(?:$)/];
          lexer.conditions = { mu: { rules: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42], inclusive: false }, emu: { rules: [2], inclusive: false }, com: { rules: [5], inclusive: false }, raw: { rules: [3, 4], inclusive: false }, INITIAL: { rules: [0, 1, 42], inclusive: true } };
          return lexer;
        })();
        parser.lexer = lexer;
        function Parser() {
          this.yy = {};
        }Parser.prototype = parser;parser.Parser = Parser;
        return new Parser();
      })();exports["default"] = handlebars;
      module.exports = exports["default"];

      /***/ },
    /* 16 */
    /***/ function(module, exports, __webpack_require__) {

      'use strict';

      var _interopRequireDefault = __webpack_require__(8)['default'];

      exports.__esModule = true;

      var _Visitor = __webpack_require__(6);

      var _Visitor2 = _interopRequireDefault(_Visitor);

      function WhitespaceControl() {}
      WhitespaceControl.prototype = new _Visitor2['default']();

      WhitespaceControl.prototype.Program = function (program) {
        var isRoot = !this.isRootSeen;
        this.isRootSeen = true;

        var body = program.body;
        for (var i = 0, l = body.length; i < l; i++) {
          var current = body[i],
              strip = this.accept(current);

          if (!strip) {
            continue;
          }

          var _isPrevWhitespace = isPrevWhitespace(body, i, isRoot),
              _isNextWhitespace = isNextWhitespace(body, i, isRoot),
              openStandalone = strip.openStandalone && _isPrevWhitespace,
              closeStandalone = strip.closeStandalone && _isNextWhitespace,
              inlineStandalone = strip.inlineStandalone && _isPrevWhitespace && _isNextWhitespace;

          if (strip.close) {
            omitRight(body, i, true);
          }
          if (strip.open) {
            omitLeft(body, i, true);
          }

          if (inlineStandalone) {
            omitRight(body, i);

            if (omitLeft(body, i)) {
              // If we are on a standalone node, save the indent info for partials
              if (current.type === 'PartialStatement') {
                // Pull out the whitespace from the final line
                current.indent = /([ \t]+$)/.exec(body[i - 1].original)[1];
              }
            }
          }
          if (openStandalone) {
            omitRight((current.program || current.inverse).body);

            // Strip out the previous content node if it's whitespace only
            omitLeft(body, i);
          }
          if (closeStandalone) {
            // Always strip the next node
            omitRight(body, i);

            omitLeft((current.inverse || current.program).body);
          }
        }

        return program;
      };
      WhitespaceControl.prototype.BlockStatement = function (block) {
        this.accept(block.program);
        this.accept(block.inverse);

        // Find the inverse program that is involed with whitespace stripping.
        var program = block.program || block.inverse,
            inverse = block.program && block.inverse,
            firstInverse = inverse,
            lastInverse = inverse;

        if (inverse && inverse.chained) {
          firstInverse = inverse.body[0].program;

          // Walk the inverse chain to find the last inverse that is actually in the chain.
          while (lastInverse.chained) {
            lastInverse = lastInverse.body[lastInverse.body.length - 1].program;
          }
        }

        var strip = {
          open: block.openStrip.open,
          close: block.closeStrip.close,

          // Determine the standalone candiacy. Basically flag our content as being possibly standalone
          // so our parent can determine if we actually are standalone
          openStandalone: isNextWhitespace(program.body),
          closeStandalone: isPrevWhitespace((firstInverse || program).body)
        };

        if (block.openStrip.close) {
          omitRight(program.body, null, true);
        }

        if (inverse) {
          var inverseStrip = block.inverseStrip;

          if (inverseStrip.open) {
            omitLeft(program.body, null, true);
          }

          if (inverseStrip.close) {
            omitRight(firstInverse.body, null, true);
          }
          if (block.closeStrip.open) {
            omitLeft(lastInverse.body, null, true);
          }

          // Find standalone else statments
          if (isPrevWhitespace(program.body) && isNextWhitespace(firstInverse.body)) {
            omitLeft(program.body);
            omitRight(firstInverse.body);
          }
        } else if (block.closeStrip.open) {
          omitLeft(program.body, null, true);
        }

        return strip;
      };

      WhitespaceControl.prototype.MustacheStatement = function (mustache) {
        return mustache.strip;
      };

      WhitespaceControl.prototype.PartialStatement = WhitespaceControl.prototype.CommentStatement = function (node) {
        /* istanbul ignore next */
        var strip = node.strip || {};
        return {
          inlineStandalone: true,
          open: strip.open,
          close: strip.close
        };
      };

      function isPrevWhitespace(body, i, isRoot) {
        if (i === undefined) {
          i = body.length;
        }

        // Nodes that end with newlines are considered whitespace (but are special
        // cased for strip operations)
        var prev = body[i - 1],
            sibling = body[i - 2];
        if (!prev) {
          return isRoot;
        }

        if (prev.type === 'ContentStatement') {
          return (sibling || !isRoot ? /\r?\n\s*?$/ : /(^|\r?\n)\s*?$/).test(prev.original);
        }
      }
      function isNextWhitespace(body, i, isRoot) {
        if (i === undefined) {
          i = -1;
        }

        var next = body[i + 1],
            sibling = body[i + 2];
        if (!next) {
          return isRoot;
        }

        if (next.type === 'ContentStatement') {
          return (sibling || !isRoot ? /^\s*?\r?\n/ : /^\s*?(\r?\n|$)/).test(next.original);
        }
      }

      // Marks the node to the right of the position as omitted.
      // I.e. {{foo}}' ' will mark the ' ' node as omitted.
      //
      // If i is undefined, then the first child will be marked as such.
      //
      // If mulitple is truthy then all whitespace will be stripped out until non-whitespace
      // content is met.
      function omitRight(body, i, multiple) {
        var current = body[i == null ? 0 : i + 1];
        if (!current || current.type !== 'ContentStatement' || !multiple && current.rightStripped) {
          return;
        }

        var original = current.value;
        current.value = current.value.replace(multiple ? /^\s+/ : /^[ \t]*\r?\n?/, '');
        current.rightStripped = current.value !== original;
      }

      // Marks the node to the left of the position as omitted.
      // I.e. ' '{{foo}} will mark the ' ' node as omitted.
      //
      // If i is undefined then the last child will be marked as such.
      //
      // If mulitple is truthy then all whitespace will be stripped out until non-whitespace
      // content is met.
      function omitLeft(body, i, multiple) {
        var current = body[i == null ? body.length - 1 : i - 1];
        if (!current || current.type !== 'ContentStatement' || !multiple && current.leftStripped) {
          return;
        }

        // We omit the last node if it's whitespace only and not preceeded by a non-content node.
        var original = current.value;
        current.value = current.value.replace(multiple ? /\s+$/ : /[ \t]+$/, '');
        current.leftStripped = current.value !== original;
        return current.leftStripped;
      }

      exports['default'] = WhitespaceControl;
      module.exports = exports['default'];

      /***/ },
    /* 17 */
    /***/ function(module, exports, __webpack_require__) {

      'use strict';

      var _interopRequireDefault = __webpack_require__(8)['default'];

      exports.__esModule = true;
      exports.SourceLocation = SourceLocation;
      exports.id = id;
      exports.stripFlags = stripFlags;
      exports.stripComment = stripComment;
      exports.preparePath = preparePath;
      exports.prepareMustache = prepareMustache;
      exports.prepareRawBlock = prepareRawBlock;
      exports.prepareBlock = prepareBlock;

      var _Exception = __webpack_require__(12);

      var _Exception2 = _interopRequireDefault(_Exception);

      function SourceLocation(source, locInfo) {
        this.source = source;
        this.start = {
          line: locInfo.first_line,
          column: locInfo.first_column
        };
        this.end = {
          line: locInfo.last_line,
          column: locInfo.last_column
        };
      }

      function id(token) {
        if (/^\[.*\]$/.test(token)) {
          return token.substr(1, token.length - 2);
        } else {
          return token;
        }
      }

      function stripFlags(open, close) {
        return {
          open: open.charAt(2) === '~',
          close: close.charAt(close.length - 3) === '~'
        };
      }

      function stripComment(comment) {
        return comment.replace(/^\{\{~?\!-?-?/, '').replace(/-?-?~?\}\}$/, '');
      }

      function preparePath(data, parts, locInfo) {
        locInfo = this.locInfo(locInfo);

        var original = data ? '@' : '',
            dig = [],
            depth = 0,
            depthString = '';

        for (var i = 0, l = parts.length; i < l; i++) {
          var part = parts[i].part,

          // If we have [] syntax then we do not treat path references as operators,
          // i.e. foo.[this] resolves to approximately context.foo['this']
              isLiteral = parts[i].original !== part;
          original += (parts[i].separator || '') + part;

          if (!isLiteral && (part === '..' || part === '.' || part === 'this')) {
            if (dig.length > 0) {
              throw new _Exception2['default']('Invalid path: ' + original, { loc: locInfo });
            } else if (part === '..') {
              depth++;
              depthString += '../';
            }
          } else {
            dig.push(part);
          }
        }

        return new this.PathExpression(data, depth, dig, original, locInfo);
      }

      function prepareMustache(path, params, hash, open, strip, locInfo) {
        // Must use charAt to support IE pre-10
        var escapeFlag = open.charAt(3) || open.charAt(2),
            escaped = escapeFlag !== '{' && escapeFlag !== '&';

        return new this.MustacheStatement(path, params, hash, escaped, strip, this.locInfo(locInfo));
      }

      function prepareRawBlock(openRawBlock, content, close, locInfo) {
        if (openRawBlock.path.original !== close) {
          var errorNode = { loc: openRawBlock.path.loc };

          throw new _Exception2['default'](openRawBlock.path.original + ' doesn\'t match ' + close, errorNode);
        }

        locInfo = this.locInfo(locInfo);
        var program = new this.Program([content], null, {}, locInfo);

        return new this.BlockStatement(openRawBlock.path, openRawBlock.params, openRawBlock.hash, program, undefined, {}, {}, {}, locInfo);
      }

      function prepareBlock(openBlock, program, inverseAndProgram, close, inverted, locInfo) {
        // When we are chaining inverse calls, we will not have a close path
        if (close && close.path && openBlock.path.original !== close.path.original) {
          var errorNode = { loc: openBlock.path.loc };

          throw new _Exception2['default'](openBlock.path.original + ' doesn\'t match ' + close.path.original, errorNode);
        }

        program.blockParams = openBlock.blockParams;

        var inverse = undefined,
            inverseStrip = undefined;

        if (inverseAndProgram) {
          if (inverseAndProgram.chain) {
            inverseAndProgram.program.body[0].closeStrip = close.strip;
          }

          inverseStrip = inverseAndProgram.strip;
          inverse = inverseAndProgram.program;
        }

        if (inverted) {
          inverted = inverse;
          inverse = program;
          program = inverted;
        }

        return new this.BlockStatement(openBlock.path, openBlock.params, openBlock.hash, program, inverse, openBlock.strip, inverseStrip, close && close.strip, this.locInfo(locInfo));
      }

      /***/ },
    /* 18 */
    /***/ function(module, exports, __webpack_require__) {

      'use strict';

      exports.__esModule = true;
      /*global define */

      var _isArray = __webpack_require__(13);

      var SourceNode = undefined;

      try {
        /* istanbul ignore next */
        if (false) {
          // We don't support this in AMD environments. For these environments, we asusme that
          // they are running on the browser and thus have no need for the source-map library.
          var SourceMap = require('source-map');
          SourceNode = SourceMap.SourceNode;
        }
      } catch (err) {}

      /* istanbul ignore if: tested but not covered in istanbul due to dist build  */
      if (!SourceNode) {
        SourceNode = function (line, column, srcFile, chunks) {
          this.src = '';
          if (chunks) {
            this.add(chunks);
          }
        };
        /* istanbul ignore next */
        SourceNode.prototype = {
          add: function add(chunks) {
            if (_isArray.isArray(chunks)) {
              chunks = chunks.join('');
            }
            this.src += chunks;
          },
          prepend: function prepend(chunks) {
            if (_isArray.isArray(chunks)) {
              chunks = chunks.join('');
            }
            this.src = chunks + this.src;
          },
          toStringWithSourceMap: function toStringWithSourceMap() {
            return { code: this.toString() };
          },
          toString: function toString() {
            return this.src;
          }
        };
      }

      function castChunk(chunk, codeGen, loc) {
        if (_isArray.isArray(chunk)) {
          var ret = [];

          for (var i = 0, len = chunk.length; i < len; i++) {
            ret.push(codeGen.wrap(chunk[i], loc));
          }
          return ret;
        } else if (typeof chunk === 'boolean' || typeof chunk === 'number') {
          // Handle primitives that the SourceNode will throw up on
          return chunk + '';
        }
        return chunk;
      }

      function CodeGen(srcFile) {
        this.srcFile = srcFile;
        this.source = [];
      }

      CodeGen.prototype = {
        prepend: function prepend(source, loc) {
          this.source.unshift(this.wrap(source, loc));
        },
        push: function push(source, loc) {
          this.source.push(this.wrap(source, loc));
        },

        merge: function merge() {
          var source = this.empty();
          this.each(function (line) {
            source.add(['  ', line, '\n']);
          });
          return source;
        },

        each: function each(iter) {
          for (var i = 0, len = this.source.length; i < len; i++) {
            iter(this.source[i]);
          }
        },

        empty: function empty() {
          var loc = arguments[0] === undefined ? this.currentLocation || { start: {} } : arguments[0];

          return new SourceNode(loc.start.line, loc.start.column, this.srcFile);
        },
        wrap: function wrap(chunk) {
          var loc = arguments[1] === undefined ? this.currentLocation || { start: {} } : arguments[1];

          if (chunk instanceof SourceNode) {
            return chunk;
          }

          chunk = castChunk(chunk, this, loc);

          return new SourceNode(loc.start.line, loc.start.column, this.srcFile, chunk);
        },

        functionCall: function functionCall(fn, type, params) {
          params = this.generateList(params);
          return this.wrap([fn, type ? '.' + type + '(' : '(', params, ')']);
        },

        quotedString: function quotedString(str) {
          return '"' + (str + '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\u2028/g, '\\u2028') // Per Ecma-262 7.3 + 7.8.4
                  .replace(/\u2029/g, '\\u2029') + '"';
        },

        objectLiteral: function objectLiteral(obj) {
          var pairs = [];

          for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
              var value = castChunk(obj[key], this);
              if (value !== 'undefined') {
                pairs.push([this.quotedString(key), ':', value]);
              }
            }
          }

          var ret = this.generateList(pairs);
          ret.prepend('{');
          ret.add('}');
          return ret;
        },

        generateList: function generateList(entries, loc) {
          var ret = this.empty(loc);

          for (var i = 0, len = entries.length; i < len; i++) {
            if (i) {
              ret.add(',');
            }

            ret.add(castChunk(entries[i], this, loc));
          }

          return ret;
        },

        generateArray: function generateArray(entries, loc) {
          var ret = this.generateList(entries, loc);
          ret.prepend('[');
          ret.add(']');

          return ret;
        }
      };

      exports['default'] = CodeGen;
      module.exports = exports['default'];

      /* NOP */

      /***/ }
    /******/ ])
});
;


//     Underscore.js 1.3.3
//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore is freely distributable under the MIT license.
//     Portions of Underscore are inspired or borrowed from Prototype,
//     Oliver Steele's Functional, and John Resig's Micro-Templating.
//     For all details and documentation:
//     http://documentcloud.github.com/underscore

define('hbs/underscore',[],function() {

  // Baseline setup
  // --------------

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var slice            = ArrayProto.slice,
      unshift          = ArrayProto.unshift,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) { return new wrapper(obj); };

  // Current version.
  _.VERSION = '1.3.3';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    if (obj.length === +obj.length) results.length = obj.length;
    return results;
  };

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError('Reduce of empty array with no initial value');
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var reversed = _.toArray(obj).reverse();
    if (context && !initial) iterator = _.bind(iterator, context);
    return initial ? _.reduce(reversed, iterator, memo, context) : _.reduce(reversed, iterator);
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    each(obj, function(value, index, list) {
      if (!iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if a given value is included in the array or object using `===`.
  // Aliased as `contains`.
  _.include = _.contains = function(obj, target) {
    var found = false;
    if (obj == null) return found;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    found = any(obj, function(value) {
      return value === target;
    });
    return found;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    return _.map(obj, function(value) {
      return (_.isFunction(method) ? method || value : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Return the maximum element or (element-based computation).
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0]) return Math.max.apply(Math, obj);
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0]) return Math.min.apply(Math, obj);
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var shuffled = [], rand;
    each(obj, function(value, index, list) {
      rand = Math.floor(Math.random() * (index + 1));
      shuffled[index] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, val, context) {
    var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      if (a === void 0) return 1;
      if (b === void 0) return -1;
      return a < b ? -1 : a > b ? 1 : 0;
    }), 'value');
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, val) {
    var result = {};
    var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
    each(obj, function(value, index) {
      var key = iterator(value, index);
      (result[key] || (result[key] = [])).push(value);
    });
    return result;
  };

  // Use a comparator function to figure out at what index an object should
  // be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator) {
    iterator || (iterator = _.identity);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >> 1;
      iterator(array[mid]) < iterator(obj) ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj)                                     return [];
    if (_.isArray(obj))                           return slice.call(obj);
    if (_.isArguments(obj))                       return slice.call(obj);
    if (obj.toArray && _.isFunction(obj.toArray)) return obj.toArray();
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    return _.isArray(obj) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especcialy useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail`.
  // Especially useful on the arguments object. Passing an **index** will return
  // the rest of the values in the array from that index onward. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = function(array, index, guard) {
    return slice.call(array, (index == null) || guard ? 1 : index);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, function(value){ return !!value; });
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return _.reduce(array, function(memo, value) {
      if (_.isArray(value)) return memo.concat(shallow ? value : _.flatten(value));
      memo[memo.length] = value;
      return memo;
    }, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator) {
    var initial = iterator ? _.map(array, iterator) : array;
    var results = [];
    // The `isSorted` flag is irrelevant if the array only contains two elements.
    if (array.length < 3) isSorted = true;
    _.reduce(initial, function (memo, value, index) {
      if (isSorted ? _.last(memo) !== value || !memo.length : !_.include(memo, value)) {
        memo.push(value);
        results.push(array[index]);
      }
      return memo;
    }, []);
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays. (Aliased as "intersect" for back-compat.)
  _.intersection = _.intersect = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = _.flatten(slice.call(arguments, 1), true);
    return _.filter(array, function(value){ return !_.include(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) results[i] = _.pluck(args, "" + i);
    return results;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i, l;
    if (isSorted) {
      i = _.sortedIndex(array, item);
      return array[i] === item ? i : -1;
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item);
    for (i = 0, l = array.length; i < l; i++) if (i in array && array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item) {
    if (array == null) return -1;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) return array.lastIndexOf(item);
    var i = array.length;
    while (i--) if (i in array && array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Binding with arguments is also known as `curry`.
  // Delegates to **ECMAScript 5**'s native `Function.bind` if available.
  // We check for `func.bind` first, to fail fast when `func` is undefined.
  _.bind = function bind(func, context) {
    var bound, args;
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length == 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, throttling, more, result;
    var whenDone = _.debounce(function(){ more = throttling = false; }, wait);
    return function() {
      context = this; args = arguments;
      var later = function() {
        timeout = null;
        if (more) func.apply(context, args);
        whenDone();
      };
      if (!timeout) timeout = setTimeout(later, wait);
      if (throttling) {
        more = true;
      } else {
        result = func.apply(context, args);
      }
      whenDone();
      throttling = true;
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      if (immediate && !timeout) func.apply(context, args);
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      return memo = func.apply(this, arguments);
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func].concat(slice.call(arguments, 0));
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) { return func.apply(this, arguments); }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    return _.map(obj, _.identity);
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var result = {};
    each(_.flatten(slice.call(arguments, 1)), function(key) {
      if (key in obj) result[key] = obj[key];
    });
    return result;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        if (obj[prop] == null) obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function.
  function eq(a, b, stack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a._chain) a = a._wrapped;
    if (b._chain) b = b._wrapped;
    // Invoke a custom `isEqual` method if one is provided.
    if (a.isEqual && _.isFunction(a.isEqual)) return a.isEqual(b);
    if (b.isEqual && _.isFunction(b.isEqual)) return b.isEqual(a);
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = stack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (stack[length] == a) return true;
    }
    // Add the first object to the stack of traversed objects.
    stack.push(a);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          // Ensure commutative equality for sparse arrays.
          if (!(result = size in a == size in b && eq(a[size], b[size], stack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent.
      if ('constructor' in a != 'constructor' in b || a.constructor != b.constructor) return false;
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], stack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    stack.pop();
    return result;
  }

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType == 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Is a given variable an arguments object?
  _.isArguments = function(obj) {
    return toString.call(obj) == '[object Arguments]';
  };
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Is a given value a function?
  _.isFunction = function(obj) {
    return toString.call(obj) == '[object Function]';
  };

  // Is a given value a string?
  _.isString = function(obj) {
    return toString.call(obj) == '[object String]';
  };

  // Is a given value a number?
  _.isNumber = function(obj) {
    return toString.call(obj) == '[object Number]';
  };

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return _.isNumber(obj) && isFinite(obj);
  };

  // Is the given value `NaN`?
  _.isNaN = function(obj) {
    // `NaN` is the only value for which `===` is not reflexive.
    return obj !== obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value a date?
  _.isDate = function(obj) {
    return toString.call(obj) == '[object Date]';
  };

  // Is the given value a regular expression?
  _.isRegExp = function(obj) {
    return toString.call(obj) == '[object RegExp]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Has own property?
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function (n, iterator, context) {
    for (var i = 0; i < n; i++) iterator.call(context, i);
  };

  // Escape a string for HTML interpolation.
  _.escape = function(string) {
    return (''+string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g,'&#x2F;');
  };

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object, ensuring that
  // they're correctly added to the OOP wrapper as well.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      addToWrapper(name, _[name] = obj[name]);
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = idCounter++;
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /.^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    '\\': '\\',
    "'": "'",
    'r': '\r',
    'n': '\n',
    't': '\t',
    'u2028': '\u2028',
    'u2029': '\u2029'
  };

  for (var p in escapes) escapes[escapes[p]] = p;
  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
  var unescaper = /\\(\\|'|r|n|t|u2028|u2029)/g;

  // Within an interpolation, evaluation, or escaping, remove HTML escaping
  // that had been previously added.
  var unescape = function(code) {
    return code.replace(unescaper, function(match, escape) {
      return escapes[escape];
    });
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    settings = _.defaults(settings || {}, _.templateSettings);

    // Compile the template source, taking care to escape characters that
    // cannot be included in a string literal and then unescape them in code
    // blocks.
    var source = "__p+='" + text
      .replace(escaper, function(match) {
        return '\\' + escapes[match];
      })
      .replace(settings.escape || noMatch, function(match, code) {
        return "'+\n_.escape(" + unescape(code) + ")+\n'";
      })
      .replace(settings.interpolate || noMatch, function(match, code) {
        return "'+\n(" + unescape(code) + ")+\n'";
      })
      .replace(settings.evaluate || noMatch, function(match, code) {
        return "';\n" + unescape(code) + "\n;__p+='";
      }) + "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __p='';" +
      "var print=function(){__p+=Array.prototype.join.call(arguments, '')};\n" +
      source + "return __p;\n";

    var render = new Function(settings.variable || 'obj', '_', source);
    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for build time
    // precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' +
      source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // The OOP Wrapper
  // ---------------

  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.
  var wrapper = function(obj) { this._wrapped = obj; };

  // Expose `wrapper.prototype` as `_.prototype`
  _.prototype = wrapper.prototype;

  // Helper function to continue chaining intermediate results.
  var result = function(obj, chain) {
    return chain ? _(obj).chain() : obj;
  };

  // A method to easily add functions to the OOP wrapper.
  var addToWrapper = function(name, func) {
    wrapper.prototype[name] = function() {
      var args = slice.call(arguments);
      unshift.call(args, this._wrapped);
      return result(func.apply(_, args), this._chain);
    };
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    wrapper.prototype[name] = function() {
      var wrapped = this._wrapped;
      method.apply(wrapped, arguments);
      var length = wrapped.length;
      if ((name == 'shift' || name == 'splice') && length === 0) delete wrapped[0];
      return result(wrapped, this._chain);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    wrapper.prototype[name] = function() {
      return result(method.apply(this._wrapped, arguments), this._chain);
    };
  });

  // Start chaining a wrapped Underscore object.
  wrapper.prototype.chain = function() {
    this._chain = true;
    return this;
  };

  // Extracts the result from a wrapped and chained object.
  wrapper.prototype.value = function() {
    return this._wrapped;
  };

    return _;

});
;
/*
    http://www.JSON.org/json2.js
    2011-10-19

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    See http://www.JSON.org/js.html


    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.
*/

/*jslint evil: true, regexp: true */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", apply,
    call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/

(function (window){

// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

// Return the window JSON element if it exists;
var JSON = window.JSON || {};

(function () {
    'use strict';

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return isFinite(this.valueOf())
                ? this.getUTCFullYear()     + '-' +
                    f(this.getUTCMonth() + 1) + '-' +
                    f(this.getUTCDate())      + 'T' +
                    f(this.getUTCHours())     + ':' +
                    f(this.getUTCMinutes())   + ':' +
                    f(this.getUTCSeconds())   + 'Z'
                : null;
        };

        String.prototype.toJSON      =
            Number.prototype.toJSON  =
            Boolean.prototype.toJSON = function (key) {
                return this.valueOf();
            };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string'
                ? c
                : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0
                    ? '[]'
                    : gap
                    ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
                    : '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0
                ? '{}'
                : gap
                ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
                : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                    typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/
                    .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                        .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function'
                    ? walk({'': j}, '')
                    : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
}());

define('hbs/json2',[],function(){
    return JSON;
});
// otherwise just leave it alone
    
}).call(this, this);
;
/**
 * @license Handlebars hbs 2.0.0 - Alex Sexton, but Handlebars has its own licensing junk
 *
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/require-cs for details on the plugin this was based off of
 */

/* Yes, deliciously evil. */
/*jslint evil: true, strict: false, plusplus: false, regexp: false */
/*global require: false, XMLHttpRequest: false, ActiveXObject: false,
define: false, process: false, window: false */
define('hbs',[
  'hbs/handlebars', 'hbs/underscore', 'hbs/json2'
], function (
  Handlebars, _, JSON
) {
    function precompile(string, _unused, options) {
    var ast, environment;

    options = options || {};

    if (!('data' in options)) {
      options.data = true;
    }

    if (options.compat) {
      options.useDepths = true;
    }

    ast = Handlebars.parse(string);

    environment = new Handlebars.Compiler().compile(ast, options);
    return new Handlebars.JavaScriptCompiler().compile(environment, options);
  }

  var fs;
  var getXhr;
  var progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'];
  var fetchText = function () {
      throw new Error('Environment unsupported.');
  };
  var buildMap = [];
  var filecode = 'w+';
  var templateExtension = 'hbs';
  var customNameExtension = '@hbs';
  var devStyleDirectory = '/styles/';
  var buildStyleDirectory = '/demo-build/styles/';
  var helperDirectory = 'templates/helpers/';
  var buildCSSFileName = 'screen.build.css';
  var onHbsReadMethod = "onHbsRead";

  Handlebars.registerHelper('$', function() {
    //placeholder for translation helper
  });

  if (typeof window !== 'undefined' && window.navigator && window.document && !window.navigator.userAgent.match(/Node.js/)) {
    // Browser action
    getXhr = function () {
      // Would love to dump the ActiveX crap in here. Need IE 6 to die first.
      var xhr;
      var i;
      var progId;
      if (typeof XMLHttpRequest !== 'undefined') {
        return ((arguments[0] === true)) ? new XDomainRequest() : new XMLHttpRequest();
      }
      else {
        for (i = 0; i < 3; i++) {
          progId = progIds[i];
          try {
            xhr = new ActiveXObject(progId);
          }
          catch (e) {}

          if (xhr) {
            // Faster next time
            progIds = [progId];
            break;
          }
        }
      }

      if (!xhr) {
          throw new Error('getXhr(): XMLHttpRequest not available');
      }

      return xhr;
    };

    // Returns the version of Windows Internet Explorer or a -1
    // (indicating the use of another browser).
    // Note: this is only for development mode. Does not run in production.
    getIEVersion = function(){
      // Return value assumes failure.
      var rv = -1;
      if (navigator.appName == 'Microsoft Internet Explorer') {
        var ua = navigator.userAgent;
        var re = new RegExp('MSIE ([0-9]{1,}[\.0-9]{0,})');
        if (re.exec(ua) != null) {
          rv = parseFloat( RegExp.$1 );
        }
      }
      return rv;
    };

    fetchText = function (url, callback) {
      var xdm = false;
      // If url is a fully qualified URL, it might be a cross domain request. Check for that.
      // IF url is a relative url, it cannot be cross domain.
      if (url.indexOf('http') != 0 ){
          xdm = false;
      }else{
          var uidx = (url.substr(0,5) === 'https') ? 8 : 7;
          var hidx = (window.location.href.substr(0,5) === 'https') ? 8 : 7;
          var dom = url.substr(uidx).split('/').shift();
          var msie = getIEVersion();
              xdm = ( dom != window.location.href.substr(hidx).split('/').shift() ) && (msie >= 7);
      }

      if ( xdm ) {
         var xdr = getXhr(true);
        xdr.open('GET', url);
        xdr.onload = function() {
          callback(xdr.responseText, url);
        };
        xdr.onprogress = function(){};
        xdr.ontimeout = function(){};
        xdr.onerror = function(){};
        setTimeout(function(){
          xdr.send();
        }, 0);
      }
      else {
        var xhr = getXhr();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function (evt) {
          //Do not explicitly handle errors, those should be
          //visible via console output in the browser.
          if (xhr.readyState === 4) {
            callback(xhr.responseText, url);
          }
        };
        xhr.send(null);
      }
    };

  }
  else if (
    typeof process !== 'undefined' &&
    process.versions &&
    !!process.versions.node
  ) {
    //Using special require.nodeRequire, something added by r.js.
    fs = require.nodeRequire('fs');
    fetchText = function ( path, callback ) {
      var body = fs.readFileSync(path, 'utf8') || '';
      // we need to remove BOM stuff from the file content
      body = body.replace(/^\uFEFF/, '');
      callback(body, path);
    };
  }
  else if (typeof java !== 'undefined' && typeof java.io !== 'undefined') {
    fetchText = function(path, callback) {
      var fis = new java.io.FileInputStream(path);
      var streamReader = new java.io.InputStreamReader(fis, "UTF-8");
      var reader = new java.io.BufferedReader(streamReader);
      var line;
      var text = '';
      while ((line = reader.readLine()) !== null) {
        text += new String(line) + '\n';
      }
      reader.close();
      callback(text, path);
    };
  }

  var cache = {};
  var fetchOrGetCached = function ( path, callback ){
    if ( cache[path] ){
      callback(cache[path]);
    }
    else {
      fetchText(path, function(data, path){
        cache[path] = data;
        callback.call(this, data);
      });
    }
  };
  var styleList = [];
  var styleMap = {};
  
  var config;
  var filesToRemove = [];

  return {

    get: function () {
      return Handlebars;
    },

    write: function (pluginName, name, write) {
      if ( (name + customNameExtension ) in buildMap) {
        var text = buildMap[name + customNameExtension];
        write.asModule(pluginName + '!' + name, text);
      }
    },

    version: '3.0.3',

    load: function (name, parentRequire, load, _config) {
            config = config || _config;

      var compiledName = name + customNameExtension;
      config.hbs = config.hbs || {};
      var disableHelpers = (config.hbs.helpers == false); // be default we enable helpers unless config.hbs.helpers is false
      var partialsUrl = '';
      if(config.hbs.partialsUrl) {
        partialsUrl = config.hbs.partialsUrl;
        if(!partialsUrl.match(/\/$/)) partialsUrl += '/';
      }

      // Let redefine default fetchText
      if(config.hbs.fetchText) {
          fetchText = config.hbs.fetchText;
      }

      var partialDeps = [];

      function recursiveNodeSearch( statements, res ) {
        _(statements).forEach(function ( statement ) {
          if ( statement && statement.type && statement.type === 'PartialStatement' ) {
          //Don't register dynamic partials as undefined
            if(statement.name.type !== "SubExpression"){
              res.push(statement.name.original);
            }
          }
          if ( statement && statement.program && statement.program.body ) {
            recursiveNodeSearch( statement.program.body, res );
          }
          if ( statement && statement.inverse && statement.inverse.body ) {
            recursiveNodeSearch( statement.inverse.body, res );
          }
        });
        return res;
      }

      // TODO :: use the parser to do this!
      function findPartialDeps( nodes , metaObj) {
      var res = [];
      if ( nodes && nodes.body ) {
        res = recursiveNodeSearch( nodes.body, [] );
      }

      if(metaObj && metaObj.partials && metaObj.partials.length){
        _(metaObj.partials).forEach(function ( partial ) {
          res.push(partial);
        });
      }

        return _.unique(res);
      }

      // See if the first item is a comment that's json
      function getMetaData( nodes ) {
        var statement, res, test;
        if ( nodes && nodes.body ) {
          statement = nodes.body[0];
          if ( statement && statement.type === 'CommentStatement' ) {
            try {
              res = ( statement.value ).replace(new RegExp('^[\\s]+|[\\s]+$', 'g'), '');
              test = JSON.parse(res);
              return res;
            }
            catch (e) {
              return JSON.stringify({
                description: res
              });
            }
          }
        }
        return '{}';
      }

      function composeParts ( parts ) {
        if ( !parts ) {
          return [];
        }
        var res = [parts[0]];
        var cur = parts[0];
        var i;

        for (i = 1; i < parts.length; ++i) {
          if ( parts.hasOwnProperty(i) ) {
            cur += '.' + parts[i];
            res.push( cur );
          }
        }
        return res;
      }

      //Taken from Handlebar.AST.helpers.helperExpression with slight modification
      function isHelper(statement){
        return !!(statement.type === 'SubExpression' || (statement.params && statement.params.length) || statement.hash);
      }

      function checkStatementForHelpers(statement, helpersres){

        if(isHelper(statement)){
          if(typeof statement.path !== 'undefined'){
            registerHelper(statement.path.original,helpersres);
          }
        }

        if(statement && statement.params){
          statement.params.forEach(function (param) {
            checkStatementForHelpers(param, helpersres);
          });
        }

        if(statement && statement.hash && statement.hash.pairs){
          _(statement.hash.pairs).forEach(function(pair) {
            checkStatementForHelpers(pair.value, helpersres);
          });
        }
      }

      function registerHelper(helperName,helpersres){
        if(typeof Handlebars.helpers[helperName] === 'undefined'){
          helpersres.push(helperName);
        }
      }

      function recursiveVarSearch( statements, res, prefix, helpersres ) {
        prefix = prefix ? prefix + '.' : '';

        var  newprefix = '';
        var flag = false;

        // loop through each statement
        _(statements).forEach(function(statement) {
          var parts;
          var part;
          var sideways;

          //Its a helper or a mustache statement
          if (isHelper(statement) || statement.type === 'MustacheStatement') {
            checkStatementForHelpers(statement, helpersres);
          }

          // If it's a meta block, not sure what this is. It should probably never happen
          if ( statement && statement.mustache  ) {
            recursiveVarSearch( [statement.mustache], res, prefix + newprefix, helpersres );
          }

          // if it's a whole new program
          if ( statement && statement.program && statement.program.body ) {
            sideways = recursiveVarSearch([statement.path],[], '', helpersres)[0] || '';
            if ( statement.inverse && statement.inverse.body ) {
             recursiveVarSearch( statement.inverse.body, res, prefix + newprefix + (sideways ? (prefix+newprefix) ? '.'+sideways : sideways : ''), helpersres);
            }
            recursiveVarSearch( statement.program.body, res, prefix + newprefix + (sideways ? (prefix+newprefix) ? '.'+sideways : sideways : ''), helpersres);
          }
        });
        return res;
      }

      // This finds the Helper dependencies since it's soooo similar
      function getExternalDeps( nodes ) {
        var res   = [];
        var helpersres = [];

        if ( nodes && nodes.body ) {
          res = recursiveVarSearch( nodes.body, [], undefined, helpersres );
        }

        var defaultHelpers = [
          'helperMissing',
          'blockHelperMissing',
          'each',
          'if',
          'unless',
          'with',
          'log',
          'lookup'
        ];

        return {
          vars: _(res).chain().unique().map(function(e) {
            if ( e === '' ) {
              return '.';
            }
            if ( e.length && e[e.length-1] === '.' ) {
              return e.substr(0,e.length-1) + '[]';
            }
            return e;
          }).value(),

          helpers: _(helpersres).chain().unique().map(function(e){
            if ( _(defaultHelpers).contains(e) ) {
              return undefined;
            }
            return e;
          }).compact().value()
        };
      }

      function cleanPath(path) {
        var tokens = path.split('/');
        for(var i=0;i<tokens.length; i++) {
          if(tokens[i] === '..') {
            delete tokens[i-1];
            delete tokens[i];
          } else if (tokens[i] === '.') {
            delete tokens[i];
          }
        }
        return tokens.join('/').replace(/\/\/+/g,'/');
      }

      function fetchAndRegister(langMap) {
          fetchText(path, function(text, path) {

          var readCallback = (config.isBuild && config[onHbsReadMethod]) ? config[onHbsReadMethod]:  function(name,path,text){return text} ;
          // for some reason it doesn't include hbs _first_ when i don't add it here...
          var nodes = Handlebars.parse( readCallback(name, path, text));
          var meta = getMetaData( nodes );
          var extDeps = getExternalDeps( nodes );
          var vars = extDeps.vars;
          var helps = (extDeps.helpers || []);
          var debugOutputStart = '';
          var debugOutputEnd   = '';
          var debugProperties = '';
          var deps = [];
          var depStr, helpDepStr, metaObj, head, linkElem;
          var baseDir = name.substr(0,name.lastIndexOf('/')+1);

          if(meta !== '{}') {
            try {
              metaObj = JSON.parse(meta);
            } catch(e) {
              console.log('couldn\'t parse meta for %s', path);
            }
          }
          var partials = findPartialDeps( nodes,metaObj );
          config.hbs = config.hbs || {};
          config.hbs._partials = config.hbs._partials || {};

          for ( var i in partials ) {
            if ( partials.hasOwnProperty(i) && typeof partials[i] === 'string') {  // make sure string, because we're iterating over all props
              var partialReference = partials[i];

              var partialPath;
              if(partialReference.match(/^(\.|\/)+/)) {
                // relative path
                partialPath = cleanPath(baseDir + partialReference);
              }
              else {
                // absolute path relative to config.hbs.partialsUrl if defined
                partialPath = cleanPath(partialsUrl + partialReference);
              }

              // check for recursive partials
              if (omitExtension) {
                if(path === parentRequire.toUrl(partialPath)) {
                  continue;
                }
              } else {
                if(path === parentRequire.toUrl(partialPath +'.'+ (config.hbs && config.hbs.templateExtension ? config.hbs.templateExtension : templateExtension))) {
                  continue;
                }
              }

              config.hbs._partials[partialPath] = config.hbs._partials[partialPath] || [];

              // we can reference a same template with different paths (with absolute or relative)
              config.hbs._partials[partialPath].references = config.hbs._partials[partialPath].references || [];
              config.hbs._partials[partialPath].references.push(partialReference);

              config.hbs._loadedDeps = config.hbs._loadedDeps || {};

              deps[i] = "hbs!"+partialPath;
            }
          }

          depStr = deps.join("', '");

          helps = helps.concat((metaObj && metaObj.helpers) ? metaObj.helpers : []);
          helpDepStr = disableHelpers ?
            '' : (function (){
              var i;
              var paths = [];
              var pathGetter = config.hbs && config.hbs.helperPathCallback
                ? config.hbs.helperPathCallback
                : function (name){
                  return (config.hbs && config.hbs.helperDirectory ? config.hbs.helperDirectory : helperDirectory) + name;
                };

              for ( i = 0; i < helps.length; i++ ) {
                paths[i] = "'" + pathGetter(helps[i], path) + "'"
              }
              return paths;
            })().join(',');

          if ( helpDepStr ) {
            helpDepStr = ',' + helpDepStr;
          }

          if (metaObj) {
            try {
              if (metaObj.styles) {
                styleList = _.union(styleList, metaObj.styles);

                // In dev mode in the browser
                if ( require.isBrowser && ! config.isBuild ) {
                  head = document.head || document.getElementsByTagName('head')[0];
                  _(metaObj.styles).forEach(function (style) {
                    if ( !styleMap[style] ) {
                      linkElem = document.createElement('link');
                      linkElem.href = config.baseUrl + devStyleDirectory + style + '.css';
                      linkElem.media = 'all';
                      linkElem.rel = 'stylesheet';
                      linkElem.type = 'text/css';
                      head.appendChild(linkElem);
                      styleMap[style] = linkElem;
                    }
                  });
                }
                else if ( config.isBuild ) {
                  (function(){
                    var fs  = require.nodeRequire('fs');
                    var str = _(metaObj.styles).map(function (style) {
                      if (!styleMap[style]) {
                        styleMap[style] = true;
                        return '@import url('+style+'.css);\n';
                      }
                      return '';
                    }).join('\n');

                    // I write out my import statements to a file in order to help me build stuff.
                    // Then I use a tool to inline my import statements afterwards. (you can run r.js on it too)
                    fs.open(__dirname + buildStyleDirectory + buildCSSFileName, filecode, '0666', function( e, id ) {
                      fs.writeSync(id, str, null, encoding='utf8');
                      fs.close(id);
                    });
                    filecode = 'a';
                  })();
                }
              }
            }
            catch(e){
              console.log('error injecting styles');
            }
          }

          if ( ! config.isBuild && ! config.serverRender ) {
            debugOutputStart = '<!-- START - ' + name + ' -->';
            debugOutputEnd = '<!-- END - ' + name + ' -->';
            debugProperties = 't.meta = ' + meta + ';\n' +
                              't.helpers = ' + JSON.stringify(helps) + ';\n' +
                              't.deps = ' + JSON.stringify(deps) + ';\n' +
                              't.vars = ' + JSON.stringify(vars) + ';\n';
          }

          var mapping = false;
          var configHbs = config.hbs || {};
          var options = _.extend(configHbs.compileOptions || {}, { originalKeyFallback: configHbs.originalKeyFallback });
          var prec = precompile( text, mapping, options);
          var tmplName = "'hbs!" + name + "',";

          if(depStr) depStr = ", '"+depStr+"'";

          var partialReferences = [];
          if(config.hbs._partials[name])
            partialReferences = config.hbs._partials[name].references;

          var handlebarsPath = (config.hbs && config.hbs.handlebarsPath) ? config.hbs.handlebarsPath : 'hbs/handlebars';

          text = '/* START_TEMPLATE */\n' +
                 'define('+tmplName+"['hbs','"+handlebarsPath+"'"+depStr+helpDepStr+'], function( hbs, Handlebars ){ \n' +
                   'var t = Handlebars.template(' + prec + ');\n' +
                   "Handlebars.registerPartial('" + name + "', t);\n";

          for(var i=0; i<partialReferences.length;i++)
            text += "Handlebars.registerPartial('" + partialReferences[i] + "', t);\n";

          text += debugProperties +
                   'return t;\n' +
                 '});\n' +
                 '/* END_TEMPLATE */\n';

          //Hold on to the transformed text if a build.
          if (config.isBuild) {
            buildMap[compiledName] = text;
          }

          //IE with conditional comments on cannot handle the
          //sourceURL trick, so skip it if enabled.
          /*@if (@_jscript) @else @*/
          if (!config.isBuild) {
            text += '\r\n//# sourceURL=' + path;
          }
          /*@end@*/

          if ( !config.isBuild ) {
            parentRequire( deps, function (){
              load.fromText(text);

              //Give result to load. Need to wait until the module
              //is fully parse, which will happen after this
              //execution.
              parentRequire([name], function (value) {
                load(value);
              });
            });
          }
          else {
            load.fromText(name, text);

            //Give result to load. Need to wait until the module
            //is fully parse, which will happen after this
            //execution.
            parentRequire([name], function (value) {
              load(value);
            });
          }

          if ( config.removeCombined && path ) {
            filesToRemove.push(path);
          }

        });
      }

      var path;
      var omitExtension = config.hbs && config.hbs.templateExtension === false;

      if (omitExtension) {
        path = parentRequire.toUrl(name);
      }
      else {
        path = parentRequire.toUrl(name +'.'+ (config.hbs && config.hbs.templateExtension ? config.hbs.templateExtension : templateExtension));
      }

      fetchAndRegister(false);
          },

    onLayerEnd: function () {
      if (config.removeCombined && fs) {
        filesToRemove.forEach(function (path) {
          if (fs.existsSync(path)) {
            fs.unlinkSync(path);
          }
        });
      }
    }
  };
});
/* END_hbs_PLUGIN */
;

/* START_TEMPLATE */
define('hbs!templates/login',['hbs','hbs/handlebars'], function( hbs, Handlebars ){ 
var t = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1;

  return "<div class=\"login\">\n    <h2>Log in</h2>\n    <div class=\"loginFailed\"></div>\n    <div class=\"credentials-place\">\n        <label for=\"login\">User name:</label>\n        <input type=\"text\" id=\"login\" value="
    + this.escapeExpression(this.lambda(((stack1 = (depth0 != null ? depth0.user : depth0)) != null ? stack1.login : stack1), depth0))
    + ">\n    </div>\n    <div class=\"credentials-place\">\n        <label for=\"pass\">Password:</label>\n        <input type=\"text\" id=\"pass\" value="
    + this.escapeExpression(this.lambda(((stack1 = (depth0 != null ? depth0.user : depth0)) != null ? stack1.password : stack1), depth0))
    + ">\n    </div>\n\n    <div class=\"loginControl\">\n        <!-- todo отображать login в одну строчку -->\n        <div class=\"signup-place\">\n            <a class=\"signup-new-user\" href=\"#admin/new\">New user</a>\n            <label for=\"rememberMe\">Keep me logged in</label>\n            <input type=\"checkbox\" id=\"rememberMe\" checked>\n        </div>\n\n        <div class=\"button-place\">\n            <input type=\"button\" id=\"loginBtn\" value=\"Log in\">\n        </div>\n    </div>\n</div>\n";
},"useData":true});
Handlebars.registerPartial('templates/login', t);
return t;
});
/* END_TEMPLATE */
;
define('views/login/LoginView',['require','exports','module','backbone','marionette','hbs!templates/login','underscore','jquery'],function (require, exports, module) {/**
 * Created by dmitry on 19.09.16.
 */


//imports
var Backbone = require('backbone');
var Marionette = require('marionette');
var LoginTemplate = require("hbs!templates/login");

var _ = require('underscore');
var $ = require('jquery');

var loginFailedClass = '.loginFailed';

module.exports = Marionette.View.extend({
    el: 'body',

    initialize: function (options) {
        _.extend(this, options);
        Backbone.history.navigate('login');
    },

    template: LoginTemplate,
    events: {
        'click input:button': 'login',  //Обработчик клика на кнопке "Log in"
        'keyup input#pass': 'keyPressEventHandler', //Обработчик нажатия enter в тексовом поле
        'keyup input#login, input#pass': 'hideLoginFailedMsg' //скрываем login failed message
    },

    login: function(){
        console.log('LoginView is login');

        this.model.save(
            {
                user: {
                    //todo pass should be encrypted on client before sending
                    login: $(this.el).find('input#login').val(),
                    password: $(this.el).find('input#pass').val()
                },
                rememberMe: $(this.el).find('input#rememberMe').val() == 'on'
            },
            {
                success: function(model, response, options){
                    console.log('login was done successfuly - user details: ' + JSON.stringify(response.user));

                    //if we don't stringify then object will be saved in localStorage incorrectly
                    localStorage.user = JSON.stringify(response.user);
                    Backbone.history.navigate(
                        'animals',
                        {
                            //we have to invoke 'animals' handler
                            trigger: true
                        }
                    );
                },

                error: function(model, xhr, options){
                    $(loginFailedClass).text(xhr.responseText).show();
                }
            }
        )
    },

    keyPressEventHandler: function(event){
        if (event.keyCode == 13){
            //it's interesting if I invoke this.render() then method above is executed
            //but data is not updated in UI
            $('input:button').click();
        }
    },

    hideLoginFailedMsg: function(){
        var $loginFailedEl = $(loginFailedClass);
        if ($loginFailedEl.is(':visible')){
            $loginFailedEl.hide();
        }
    },

    onRender: function() {
        //we can put some code here that will be invoked before
        //this layoutView will be rendered
        console.log('LoginView is onRender');
    },

    //it's required to show data in hbs template
    serializeData: function () {
        return {
            user: this.model.user
        };
    }

});
});


/* START_TEMPLATE */
define('hbs!templates/animalsScreen',['hbs','hbs/handlebars'], function( hbs, Handlebars ){ 
var t = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<div id=\"animalsScreen\">\n    <div id=\"mainMenu\"></div>\n    <div id=\"animals\"></div>\n</div>";
},"useData":true});
Handlebars.registerPartial('templates/animalsScreen', t);
return t;
});
/* END_TEMPLATE */
;

/* START_TEMPLATE */
define('hbs!templates/mainMenu',['hbs','hbs/handlebars'], function( hbs, Handlebars ){ 
var t = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<header>\n    <ul>\n        <li><a href=\"#\">Home</a></li>\n        <li class=\"export\">\n            <a href=\"javascript:void(0)\" class=\"dropbtn\">Export</a>\n            <div class=\"export-dropdown\">\n                <a href=\"/export/json\">JSON</a>\n                <a href=\"/export/csv\">CSV</a>\n                <a href=\"/export/excel\">Excel</a>\n            </div>\n        </li>\n        <!-- todo this option should be shown only if there is Admin permissions-->\n        <li><a href=\"#admin\">Admin</a></li>\n        <li class=\"log-out\">\n            <a href=\"#login\">Log out</a>\n        </li>\n    </ul>\n</header>\n";
},"useData":true});
Handlebars.registerPartial('templates/mainMenu', t);
return t;
});
/* END_TEMPLATE */
;
define('views/MainMenuView',['require','exports','module','marionette','hbs!templates/mainMenu'],function (require, exports, module) {/**
 * Created by dmitry on 28.09.16.
 */


var Marionette = require('marionette');
var MainMenuTemplate = require("hbs!templates/mainMenu");

module.exports = Marionette.View.extend({
    template: MainMenuTemplate,

    initialize: function(options){
        _.extend(this, options);
    },

    onRender: function(){
        console.log("MainMenuView onRender");
    }

});

});


/* START_TEMPLATE */
define('hbs!templates/animalsTable',['hbs','hbs/handlebars'], function( hbs, Handlebars ){ 
var t = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<table class=\"animals-table\">\n    <thead>\n        <tr>\n            <th>Name</th>\n            <th>Species</th>\n            <th>Age</th>\n            <th>Cage</th>\n            <th>Keeper</th>\n        </tr>\n    </thead>\n\n    <!-- insert data -->\n    <tbody></tbody>\n    <tfoot>\n        <tr>\n            <td colspan=\"5\">Animals table footer</td>\n        </tr>\n    </tfoot>\n</table>";
},"useData":true});
Handlebars.registerPartial('templates/animalsTable', t);
return t;
});
/* END_TEMPLATE */
;

/* START_TEMPLATE */
define('hbs!templates/animalRow',['hbs','hbs/handlebars'], function( hbs, Handlebars ){ 
var t = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1, helper;

  return "<td>"
    + this.escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"name","hash":{},"data":data}) : helper)))
    + "</td>\n<td>"
    + this.escapeExpression(((helper = (helper = helpers.species || (depth0 != null ? depth0.species : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"species","hash":{},"data":data}) : helper)))
    + "</td>\n<td>"
    + this.escapeExpression(((helper = (helper = helpers.age || (depth0 != null ? depth0.age : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"age","hash":{},"data":data}) : helper)))
    + "</td>\n<td>"
    + this.escapeExpression(this.lambda(((stack1 = (depth0 != null ? depth0.cage : depth0)) != null ? stack1.name : stack1), depth0))
    + "</td>\n<td>"
    + this.escapeExpression(this.lambda(((stack1 = (depth0 != null ? depth0.keeper : depth0)) != null ? stack1.name : stack1), depth0))
    + " "
    + this.escapeExpression(this.lambda(((stack1 = (depth0 != null ? depth0.keeper : depth0)) != null ? stack1.surname : stack1), depth0))
    + "</td>";
},"useData":true});
Handlebars.registerPartial('templates/animalRow', t);
return t;
});
/* END_TEMPLATE */
;
define('views/animals/AnimalRowView',['require','exports','module','marionette','hbs!templates/animalRow'],function (require, exports, module) {/**
 * Created by dmitry on 31.10.16.
 */


var Marionette = require('marionette');
var AnimalRowTemplate = require("hbs!templates/animalRow");

module.exports = Marionette.View.extend({
    //all template's content will be wrapped with 'tr' tag
    tagName: "tr",
    className: 'animals-table-row',
    template: AnimalRowTemplate,

    initialize: function (options) {
        _.extend(this, options);
    },

    //it's required to show data in hbs template
    serializeData: function () {
        var animal = this.model.attributes;
        return {
            name: animal.name,
            species: animal.species,
            age: animal.age,
            cage: animal.cage,
            keeper: animal.keeper
        };
    }

});

});

define('views/animals/AnimalTableBodyView',['require','exports','module','marionette','./AnimalRowView'],function (require, exports, module) {/**
 * Created by dmitry on 02.12.16.
 */


var Marionette = require('marionette');
var AnimalRowView = require("./AnimalRowView");

module.exports = Marionette.CollectionView.extend({
    tagName: 'tbody',
    childView: AnimalRowView
});

});

define('views/animals/AnimalsTableView',['require','exports','module','marionette','hbs!templates/animalsTable','./AnimalTableBodyView'],function (require, exports, module) {/**
 * Created by dmitry on 28.09.16.
 */


var Marionette = require('marionette');
var AnimalsTemplate = require("hbs!templates/animalsTable");
var AnimalTableBodyView = require("./AnimalTableBodyView");


//Details http://marionettejs.com/docs/v3.0.0/marionette.collectionview.html#rendering-tables
module.exports = Marionette.View.extend({
    //all template's content will be wrapped with 'table' tag
    template: AnimalsTemplate,

    regions: {
        body: {
            el: 'tbody',
            replaceElement: true
        }
    },

    initialize: function (options) {
        _.extend(this, options);
        Backbone.history.navigate('animals');
    },

    onRender: function(){
        this.showChildView('body', new AnimalTableBodyView({
            collection: this.collection
        }));
    }

});


});

define('views/animals/AnimalsView',['require','exports','module','marionette','hbs!templates/animalsScreen','./../MainMenuView','./AnimalsTableView'],function (require, exports, module) {/**
 * Created by dmitry on 28.09.16.
 */


var Marionette = require('marionette');
var AnimalsScreenTemplate = require("hbs!templates/animalsScreen");

var MainMenuView = require("./../MainMenuView");
var AnimalsTableView = require("./AnimalsTableView");

module.exports = Marionette.View.extend({
    el: "body",
    template: AnimalsScreenTemplate,

    regions: {
        header: "#mainMenu",
        main: "#animals"
    },

    initialize: function (options) {
        _.extend(this, options);
    },

    onRender: function(){
        this.showChildView('header', new MainMenuView());
        this.showChildView('main', new AnimalsTableView({
            collection: this.collection
        }));

        console.log("AnimalsView onRender");
    }

});


});


/* START_TEMPLATE */
define('hbs!templates/admin/adminScreen',['hbs','hbs/handlebars'], function( hbs, Handlebars ){ 
var t = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<div id=\"adminScreen\">\n    <div id=\"mainMenu\"></div>\n    <div id=\"user-table\"></div>\n    <div id=\"user-editor\"></div>\n</div>";
},"useData":true});
Handlebars.registerPartial('templates/admin/adminScreen', t);
return t;
});
/* END_TEMPLATE */
;

/* START_TEMPLATE */
define('hbs!templates/admin/adminEditor',['hbs','hbs/handlebars'], function( hbs, Handlebars ){ 
var t = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<h1>Admin Editor</h1>";
},"useData":true});
Handlebars.registerPartial('templates/admin/adminEditor', t);
return t;
});
/* END_TEMPLATE */
;
define('views/admin/AdminUserEditorView',['require','exports','module','marionette','hbs!templates/admin/adminEditor'],function (require, exports, module) {/**
 * Created by dmitry on 30.12.16.
 */


var Marionette = require('marionette');
var AdminEditorTemplate = require("hbs!templates/admin/adminEditor");

module.exports = Marionette.View.extend({
    template: AdminEditorTemplate,

    initialize: function(options){
        _.extend(this, options);
    },

    onRender: function(){
        console.log("AdminEditor onRender");
    }

});


});


/* START_TEMPLATE */
define('hbs!templates/admin/adminUserTable',['hbs','hbs/handlebars'], function( hbs, Handlebars ){ 
var t = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<table class=\"users-table\">\n    <thead>\n    <tr>\n        <th>Name</th>\n        <th>Surname</th>\n        <th>Email</th>\n        <th>Login</th>\n        <th>Roles</th>\n        <th>Animals</th>\n    </tr>\n    </thead>\n\n    <!-- insert data -->\n    <tbody></tbody>\n</table>";
},"useData":true});
Handlebars.registerPartial('templates/admin/adminUserTable', t);
return t;
});
/* END_TEMPLATE */
;

/* START_TEMPLATE */
define('hbs!templates/admin/adminUserTableRow',['hbs','hbs/handlebars'], function( hbs, Handlebars ){ 
var t = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var helper;

  return "<td>"
    + this.escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"name","hash":{},"data":data}) : helper)))
    + "</td>\n<td>"
    + this.escapeExpression(((helper = (helper = helpers.surname || (depth0 != null ? depth0.surname : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"surname","hash":{},"data":data}) : helper)))
    + "</td>\n<td>"
    + this.escapeExpression(((helper = (helper = helpers.email || (depth0 != null ? depth0.email : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"email","hash":{},"data":data}) : helper)))
    + "</td>\n<td>"
    + this.escapeExpression(((helper = (helper = helpers.login || (depth0 != null ? depth0.login : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"login","hash":{},"data":data}) : helper)))
    + "</td>\n<td>"
    + this.escapeExpression(((helper = (helper = helpers.roles || (depth0 != null ? depth0.roles : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"roles","hash":{},"data":data}) : helper)))
    + "</td>\n<td>"
    + this.escapeExpression(((helper = (helper = helpers.animals || (depth0 != null ? depth0.animals : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0,{"name":"animals","hash":{},"data":data}) : helper)))
    + "</td>";
},"useData":true});
Handlebars.registerPartial('templates/admin/adminUserTableRow', t);
return t;
});
/* END_TEMPLATE */
;
define('views/admin/AdminUserTableRowView',['require','exports','module','marionette','hbs!templates/admin/adminUserTableRow'],function (require, exports, module) {/**
 * Created by dmitry on 30.12.16.
 */


var Marionette = require('marionette');
var AdminUserTableRowTemplate = require("hbs!templates/admin/adminUserTableRow");

module.exports = Marionette.View.extend({
    tagName: "tr",
    className: 'user-table-row',
    template: AdminUserTableRowTemplate,

    initialize: function (options) {
        _.extend(this, options);
    },

    //it's required to show data in hbs template
    serializeData: function () {
        var user = this.model.attributes;
        return {
            name: user.name,
            surname: user.surname,
            email: user.email,
            login: user.login,
            roles: user.roles,
            animals: user.animals
        };
    }

});


});

define('views/admin/AdminUserTableBodyView',['require','exports','module','marionette','./AdminUserTableRowView'],function (require, exports, module) {/**
 * Created by dmitry on 12.01.17.
 */


var Marionette = require('marionette');
var AdminUserTableRowView = require("./AdminUserTableRowView");

module.exports = Marionette.CollectionView.extend({
    tagName: 'tbody',
    childView: AdminUserTableRowView
});


});

define('views/admin/AdminUserTableView',['require','exports','module','marionette','hbs!templates/admin/adminUserTable','./AdminUserTableBodyView'],function (require, exports, module) {/**
 * Created by dmitry on 30.12.16.
 */


var Marionette = require('marionette');
var AdminUserTableTemplate = require("hbs!templates/admin/adminUserTable");
var AdminUserTableBodyView = require("./AdminUserTableBodyView");

module.exports = Marionette.View.extend({
    template: AdminUserTableTemplate,

    regions: {
        body: {
            el: 'tbody',
            replaceElement: true
        }
    },

    initialize: function(options){
        _.extend(this, options);
    },

    onRender: function(){
        this.showChildView('body', new AdminUserTableBodyView({
            collection: this.collection
        }));

        console.log("AdminEditor onRender");
    }

});


});

define('views/admin/AdminView',['require','exports','module','marionette','hbs!templates/admin/adminScreen','./../MainMenuView','./AdminUserEditorView','./AdminUserTableView'],function (require, exports, module) {/**
 * Created by dmitry on 30.12.16.
 */


var Marionette = require('marionette');
var AdminScreenTemplate = require("hbs!templates/admin/adminScreen");

var MainMenuView = require("./../MainMenuView");
var AdminUserEditorView = require("./AdminUserEditorView");
var AdminUserTableView = require("./AdminUserTableView");

module.exports = Marionette.View.extend({
    el: "body",
    template: AdminScreenTemplate,

    regions: {
        header: "#mainMenu",
        userTable: "#user-table",
        userEditor: "#user-editor"
    },

    initialize: function (options) {
        _.extend(this, options);
    },

    onRender: function () {
        this.showChildView('header', new MainMenuView());
        this.showChildView('userTable', new AdminUserTableView({
            collection: this.collection
        }));

        //todo comment this view
        this.showChildView('userEditor', new AdminUserEditorView());

        console.log("AdminView onRender");
    }

});



});

define('models/LoginModel',['require','exports','module','backbone'],function (require, exports, module) {/**
 * Created by dmitry on 27.09.16.
 */


var Backbone = require('backbone');
module.exports = Backbone.Model.extend({
    user: {
        login: 'test',
        password: ''
    },
    url: '/login'
});


});

define('models/UserModel',['require','exports','module','backbone'],function (require, exports, module) {/**
 * Created by dmitry on 30.12.16.
 */


var Backbone = require('backbone');
module.exports = Backbone.Model.extend({
    defaults: {
        name: null,
        surname: null,
        email: null,
        login: null,
        roles: [],
        animals: []
    }
});


});

define('models/AnimalModel',['require','exports','module','backbone'],function (require, exports, module) {/**
 * Created by dmitry on 17.10.16.
 */


var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
    defaults: {
        order: null,
        name: 'undefined',
        species: "undefined",
        age: null,
        cage: null,
        keeper: 'undefined'
    }
});

});

define('models/AnimalsCollection',['require','exports','module','backbone','./AnimalModel'],function (require, exports, module) {/**
 * Created by dmitry on 17.10.16.
 */


var Backbone = require('backbone');
var AnimalModel = require('./AnimalModel');

module.exports = Backbone.Collection.extend({
    model: AnimalModel,
    url: '/animals',

    initialize: function(options){
        _.extend(this, options);

        //initialize collection from back-end
        //otherwise it will be empty
        var animals = this;
        animals.fetch().done(function() {
            animals.each(function(item){
                console.log(item.get('name'));
            });
        });
    }

});
});

define('models/UsersCollection',['require','exports','module','backbone','./UserModel'],function (require, exports, module) {/**
 * Created by dmitry on 17.10.16.
 */


var Backbone = require('backbone');
var UserModel = require('./UserModel');

module.exports = Backbone.Collection.extend({
    model: UserModel,
    url: '/users',

    initialize: function(options){
        _.extend(this, options);

        //initialize collection from back-end
        //otherwise it will be empty
        var users = this;
        users.fetch().done(function() {
            users.each(function(item){
                console.log(item.get('name'));
            });
        });
    }

});
});

define('AppController',['require','exports','module','marionette','./views/login/LoginView','./views/animals/AnimalsView','./views/admin/AdminView','./models/LoginModel','./models/UserModel','./models/AnimalsCollection','./models/UsersCollection','underscore'],function (require, exports, module) {/**
 * Created by dmitry on 19.08.16.
 */


var Marionette = require('marionette');

var LoginView = require('./views/login/LoginView');
var AnimalsView = require('./views/animals/AnimalsView');
var AdminView = require('./views/admin/AdminView');

//models
var LoginModel = require('./models/LoginModel');
var UserModel = require('./models/UserModel');
var AnimalsCollection = require('./models/AnimalsCollection');
var UsersCollection = require('./models/UsersCollection');

var _ = require('underscore');

function getUserFromLocalStorage() {
    if (localStorage.user && localStorage.user != 'undefined') {
        return JSON.parse(localStorage.user);
    }
}

function updateLoginModel(loginModel) {
    //check user in localstorage
    //and set login if it exists
    var user = getUserFromLocalStorage();
    if (user) {
        loginModel.user.login = user.login;
    }
    return loginModel;
}

function showloginView(loginModel) {
    var loginView = new LoginView({
        model: updateLoginModel(loginModel)
    }).render();
}

function handleRequest(success, error){
    var loginModel = updateLoginModel(new LoginModel());
    if (!loginModel.user.login) {
        showloginView(loginModel);
    }

    loginModel.sync(
        'GET',
        loginModel,
        {
            success: success,

            error: function (model, response, options) {
                if (error){
                    return error(model, response, options);
                }

                console.log('login/check - error: ' + response.responseText);
                showloginView(loginModel);
            }
        }
    )
}

//Started with marionette 3.0 Marionette.Object should be used instead of Marionette.Controller
module.exports = Marionette.Object.extend({

    initialize: function (options) {
        //set some external params to this controller instance
        _.extend(this, options);
    },

    login: function () {
        console.log('AppController: login is invoked');
        showloginView(new LoginModel())
    },

    animals: function () {
        console.log('AppController: animals is invoked');
        handleRequest(function (model, response, options) {
            console.log('login/check - success)');

            //details how collection can be shown
            //http://stackoverflow.com/questions/27673371/backbone-js-collection-view-example-using-marionette-template
            var animalsView = new AnimalsView({
                collection: new AnimalsCollection()
            });
            animalsView.render();
        });

    },

    admin: function () {
        console.log('AppController: admin is invoked');
        handleRequest(function (model, response, options) {
            console.log('login/check - success)');
            var user = model.user;
            if (user.roles && user.roles.indexOf('ADMIN') != -1) {
                var animalsView = new AdminView({
                    collection: new UsersCollection()
                });
                animalsView.render();
            } else {
                console.error("user dosn't have admin permissions");
                //todo надо показывать какую-то error page
            }

        });
    }
});

});

define('App',['require','exports','module','backbone','marionette','./AppRouter','./AppController'],function (require, exports, module) {/**
 * Created by dmitry on 19.08.16.
 */


//imports
var Backbone = require('backbone');
var Marionette = require('marionette');

//routers
var AppRouter = require('./AppRouter');
var AppController = require('./AppController');

//init
module.exports = Marionette.Application.extend({
    initialize: function(options) {
        //some initializers can be added here
        //keep it just in case as an example
        console.log('App.initialize is invoked with options: ' + options);
    },

    onStart: function() {


        //init controller and router
        var appController = new AppController();
        var appRouter = new AppRouter({
            controller: appController
        });

        if (Backbone.history){
            Backbone.history.start();
        }
    }

});
});

define('main',['require','exports','module','./App','jquery'],function (require, exports, module) {/**
 * Created by dmitry on 06.07.16.
 */



var App = require('./App');

//require jquery is for example and be able to invoke $(document).ready(main) from index.hbs
//if we use backbone or jquery then his require is not needed
var $ = require('jquery');

module.exports = function(){
    console.log('main is started');


    new App({
        //just in case to pass something in Marionetter application
    }).start();
};

});

/**
 * Created by dmitry on 06.07.16.
 */
/**
 * Created by dmitry on 13.05.16.
 */
require.config({
    baseUrl: '.',
    paths: {
        'jquery': '../static/components/jquery/dist/jquery.min',
        'underscore': '../static/components/underscore/underscore-min',
        'backbone': '../static/components/backbone/backbone-min',
        'backbone.radio': '../static/components/backbone.radio/build/backbone.radio.min',
        'marionette': "../static/components/backbone.marionette/lib/backbone.marionette.min",

        // Handlerbars plugins
        hbs: "../static/components/hbs/hbs",

        // Marionette application
        App: "./App"
    },

    hbs: {
        helperDirectory: 'templates/helpers/',
        i18nDirectory: 'templates/i18n',
        templateExtension: "hbs",
        disableI18n: true,
        disableHelpers: false
    },

    //для поддержки сторонних модулей описанных не через define
    //если в данном случае убрать блок shim, то мы не сможем обращаться к
    //underscore через require('underscore')
    //напр-р, jQuery уже поддерживает стандарт AMD и его не обязательно описывать в блоке shim
    shim: {
        underscore: {
            exports: '_'
        },
        backbone: {
            deps: ["underscore", "jquery"],
            exports: "Backbone"
        }
    },
    deps: ['require'],
    callback: function(require){
        //this construction helps to specify main.js with all dependencies in 'define' section
        //when grunt requirejs:task is executed
        require(['./main']);
    }
});

// main.js can be loaded with this instruction or as we did with callback
//requirejs(['./main']);


define("config", function(){});

