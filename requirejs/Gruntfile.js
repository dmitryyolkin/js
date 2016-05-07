/*global module:false*/
module.exports = function(grunt) {
    'use strict';

    //variables
    var scrDir = 'src_grunt/';
    var buildDir = 'build/';

    // Project configuration.
    grunt.initConfig({
        // Metadata.
        pkg: grunt.file.readJSON('package.json'),

        // Task configuration.
        //jshint: {
        //    options: {
        //        jshintrc: '.jshintrc'
        //    },
        //    gruntfile: {
        //        src: 'Gruntfile.js'
        //    },
        //    sourcefiles: {
        //        src: ['src/**/*.js', '!src/app/bower_components/**/*.js']
        //    }
        //},

        //clean build directory
        clean: [buildDir],

        requirejs: {
            //All possible values can be found here
            //https://github.com/requirejs/r.js/blob/master/build/example.build.js
            options: {
                'appDir': scrDir,
                'dir': buildDir,
                'mainConfigFile': scrDir + 'config.js',
                'optimize': 'none'
                //'optimize': 'uglify2',
                //'normalizeDirDefines': 'skip',
                //'skipDirOptimize': true,
            },
            centralized: {
                options: {
                    //modules specifies what module should be optimized
                    //in name we specify name of JS file

                    //As a result we have one main,js file including all files in itself in build directory
                    //All other files can be removed
                    'modules': [{
                        'name': 'main',
                        'include': [
                            'jquery',
                            'underscore',

                            //specify local files that should be included in build/main.js
                            //we don't include all other js files becasue they will be added automatically through require dependencies
                            'controllers/AddController',
                            'controllers/ListController'
                        ]
                    }]
                }
            },

            centralizedAlmond: {
                //almond is small AMD (Asynchronious Model Definition) loader that is much smaller than requirejs
                //and typically included at the same output file

                //Useful links:
                //https://github.com/requirejs/almond
                //http://www.codechewing.com/library/optimise-requirejs-almond-grunt/

                //TODO please keep in mind this config works only with grunt-requirejs (that contains almond module internally)
                //and doesn't work with grunt-contrib-requirejs
                options: {
                    //As a result we have one main.js file including all files in itself in build directory
                    //All other files can be removed

                    //In addition almond.js in included in main.js as well and require.js can be removed from build directory as well
                    almond: true,
                    //replaceRequireScript section remove src="components/requirejs/require.js"
                    //and replace data-main="main" with src="main.js"
                    replaceRequireScript: [{
                        files: [buildDir + 'index.html'],
                        module: 'main',
                        modulePath: 'main'
                    }],
                    'modules': [{
                        'name': 'main',
                        'include': [
                            'jquery',
                            'underscore',

                            //if config is not included in final file then almond configuration doesn't work
                            'config',

                            //specify local files that should be included in build/main.js
                            //we don't include all other js files becasue they will be added automatically through require dependencies
                            'controllers/AddController',
                            'controllers/ListController'
                        ]
                    }]
                }
            },

            independent: {
                options: {
                    //in this scheme we will have two new modules
                    //  * controllers/list - it contains everything related to List users (without adding possibilities)
                    //      * main.js
                    //      * index.html
                    //  * controllers/add - it contains everything related to Add users (without listing possibilities)
                    //      * main.js
                    //      * index.html
                    'modules': [{
                        name: 'controllers/list/main',

                        'create': true, //allow to create new file
                        include: [
                            'jquery',
                            'underscore',
                            'main',
                            'controllers/ListController'
                        ]
                    },

                    //add config
                    {
                        name: 'controllers/add/main',

                        'create': true, //allow to create new file
                        include: [
                            'jquery',
                            'underscore',
                            'main',
                            'controllers/AddController'
                        ]
                    }]
                }
            },

            //common sources are in one js file
            //and separate resources in separate files without common
            shared: {
                options: {
                    //As a result we have in build directory
                    //  main.js with jQuery, _, User, Router
                    //  controllers
                    //      ListController including ListView
                    //      AddController including AddView
                    'modules': [
                        {
                            'name': 'main',
                            'include': ['jquery', 'underscore']
                        },
                        {
                            'name': 'controllers/ListController',
                            //ListView will be added automaticaly
                            'include': [],
                            'exclude': ['main']
                        },
                        {
                            'name': 'controllers/AddController',
                            //AddView will be added automaticaly
                            'include': [],
                            'exclude': ['main']
                        }
                    ]
                }
            }
        },

        //this task is needed for requirejs:independent only
        //replace path to components/requirejs and css in build/index.html

        //Potentially we don't need to replace something - all could be done with 'copy' plugin
        //requirejs and css could be copied to appropriate paths
        'string-replace': {
            dist: {
                files: [
                    {
                        expand: true,
                        cwd: buildDir,//src dir
                        src: 'index.html',
                        dest: buildDir //build dir
                    }
                ],
                options: {
                    replacements: [
                        {
                            pattern: 'components/requirejs/require.js',
                            replacement: '../../components/requirejs/require.js'
                        },
                        {
                            pattern: '../css/style.css',
                            replacement: '../../../css/style.css'
                        }]
                }
            }
        },

        copy: {
            //this task is needed for requirejs:independent only
            //we copy base src_grunt/index.html to build/controllers/list/index.html and build/controllers/add/index.html
            main: {
                files: [
                    //list index.html config
                    {
                        expand: true,
                        //cwd specifies src dir - without it index.html will be copied to scr_grunt/index.html
                        cwd: buildDir,
                        src: ['index.html'],
                        dest: buildDir + 'controllers/list'
                    },

                    //add index.html config
                    {
                        expand: true,
                        //cwd specifies src dir - without it index.html will be copied to scr_grunt/index.html
                        cwd: buildDir,
                        src: ['index.html'],
                        dest: buildDir + 'controllers/add'
                    }
                ]
            }
        }
    });

    // These plugins provide necessary tasks.
    //grunt.loadNpmTasks('grunt-contrib-jshint');

    //clean build directory
    grunt.loadNpmTasks('grunt-contrib-clean');

    //grunt.loadNpmTasks('grunt-contrib-requirejs');
    //grunt-requirejs is much better becasue it contains internally almond,js and other modules
    //if you want to compile with almond please use grunt-requirejs
    //if you don't need almond you can use grunt-contrib-requirejs
    grunt.loadNpmTasks('grunt-requirejs');

    //details regarding grunt-contrib-copy can be found http://grunt-tasks.com/grunt-contrib-copy/
    grunt.loadNpmTasks('grunt-contrib-copy');

    //details can be found https://www.npmjs.com/package/grunt-string-replace
    grunt.loadNpmTasks('grunt-string-replace');


    // Default task.
    grunt.registerTask('default', ['clean', 'requirejs:centralized']);
    //grunt.registerTask('default', ['clean', 'requirejs:centralizedAlmond']);
    //grunt.registerTask('default', ['clean', 'requirejs:independent', 'string-replace', 'copy']);
    //grunt.registerTask('default', ['clean', 'requirejs:shared']);
};
