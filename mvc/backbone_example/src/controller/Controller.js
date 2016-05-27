/**
 * Created by dmitry on 17.05.16.
 */

define(function(require){
    var backbone = require('backbone');
    var $ = require("jquery");
    var _ = require("underscore");

    return backbone.Router.extend({
        initialize: function(options){
            //_,extend копирует все св-ва из destination = options в source = this
            _.extend(this, options);
        },

        //ставит в  соответсвие hash-tag и обработчик
        routes: {
            "": "start", //Пустой hash-тег
            "!/": "start", //initial page
            "!/success": "success", //success hash-tag
            "!/error": "error" //error hash-tag
        },

        start: function () {
            var startView = this.Views.StartView;
            if (!_.isNull(startView) && !_.isUndefined(startView)) {
                startView.render();
            }
        },

        success: function () {
            var successView = this.Views.SuccessView;
            if (!_.isNull(successView) && !_.isUndefined(successView)) {
                successView.render();
            }
        },

        error: function () {
            var errorView = this.Views.ErrorView;
            if (!_.isNull(errorView) && !_.isUndefined(errorView)) {
                errorView.render();
            }
        }

    });
});
