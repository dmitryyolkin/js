/**
 * Created by dmitry on 06.07.16.
 */
/*global module:false*/
module.exports = function (grunt) {
    'use strict';

    //variables
    var srcDir = 'client/';
    var buildDir = 'client/';

    // Project configuration.
    grunt.initConfig({
        // Metadata.
        pkg: grunt.file.readJSON('package.json'),

        requirejs: {
            //All possible values can be found here
            //https://github.com/requirejs/r.js/blob/master/build/example.build.js
            options: {

                mainConfigFile: srcDir + 'config.js',
                out: buildDir + 'main-single.js',

                optimize: 'none',
                //'optimize': 'uglify2',

                //================ cajon specific =============================
                //================ cajon allows Node style in client js =======

                //Instruct the r.js optimizer to
                //convert commonjs-looking code
                //to AMD style, which is needed for
                //the optimizer to properly trace
                //dependencies.
                cjsTranslate: true
            },
            centralized: {
                //if we use modules option (see examples in my github https://github.com/dmitryyolkin/js/tree/master/requirejs)
                //then we have to use 'appDir' and 'dir' attributes and DON'T use out because in this case we optimize whole directory (but not a separate file)

                //if we use 'baseUrl' and 'out' attributes then we optimize one single file only
                //we don't optimize whole directory

                options: {
                    //As a result we have one main,js file including all files in itself in build directory
                    include: ['config', 'main'],

                    //The name parameter is pointing to almond, relative to our baseUrl, which will include almond in the build process.
                    //almond is small AMD (Asynchronious Model Definition) loader that is much smaller than requirejs
                    //and typically included at the same output file
                    name: '../static/components/almond/almond'
                }
            }
        },

        less: {
            production: {
                //https://github.com/gruntjs/grunt-contrib-less
                options: {
                    compress: true
                },
                files: {
                    "static/less/styles.min.css": "static/less/styles.less"
                }
            }
        },

        //server side test are run with simple-mocha
        //https://github.com/yaymukund/grunt-simple-mocha
        simplemocha: {
            src: 'test/**/*.js',
            options: {
                globals: ['should', 'cptable', 'QUOTE'],
                timeout: 10000,
                ignoreLeaks: false,
                ui: 'bdd'
            }
        },

        // Tests (client-side) run with help of Phantom.js
        //https://github.com/kmiyashiro/grunt-mocha
        mocha: {
            test: {
                src: ["client/test/**/*.html"],
                options: {
                    log: true, // uncomment if you want to see console.log output
                    logErrors: true,
                    reporter: "Spec",
                    ui: "bdd",
                    //set run = false when mocha.run() will be run asynchroniously with AMD
                    //Otherwise ser run = true (for synchronous run)
                    run: false,
                    ignoreLeaks: true
                }
            }
        },

        concurrent: {
            //speed up building process
            verify: [
                'simplemocha',
                'mocha:test'
            ]
        }
    });

    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-simple-mocha');
    grunt.loadNpmTasks('grunt-mocha');
    grunt.loadNpmTasks('grunt-concurrent');

    // Default task.
    //grunt.registerTask('default', ['clean', 'requirejs:centralized']);
    grunt.registerTask('default', ['less', 'concurrent:verify', 'requirejs:centralized']);
};

