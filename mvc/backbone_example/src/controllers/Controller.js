/**
 * Created by dmitry on 17.05.16.
 */

define(function(require){
    var backbone = require('backbone');
    var _ = require("underscore");

    return backbone.Router.extend({
        initialize: function(options){
            //_,extend копирует все св-ва (в частности model) из destination = options в source = this
            _.extend(this, options);

            //bind model change with navigation - it's needed for changing hash tag in URL
            //I don't know most correct place for binding model and controller - so I've put it here
            var changeStateHandler = _.bind(function(){
                var state = this.model.get('state');
                if (state == 'start'){
                    // false потому, что нам не надо вызывать обработчик у Router
                    this.navigate('!/', false);
                }else{
                    this.navigate('!/' + state, false);
                }
            }, this);
            this.model.bind('change:state', changeStateHandler);
        },

        //ставит в соответсвие hash-tag и обработчик
        routes: {
            "": "start", //Пустой hash-тег
            "!/": "start", //initial page
            "!/success": "success", //success hash-tag
            "!/error": "error" //error hash-tag
        },

        start: function () {
            this.model.set({
                'state': 'start'
            });
        },

        success: function () {
            this.model.set({
                'state': 'success'
            });
        },

        error: function () {
            this.model.set({
                'state': 'error'
            });
        }

    });
});
