/*
 * Revel Systems Online Ordering Application
 *
 *  Copyright (C) 2014 by Revel Systems
 *
 * This file is part of Revel Systems Online Ordering open source application.
 *
 * Revel Systems Online Ordering open source application is free software: you
 * can redistribute it and/or modify it under the terms of the GNU General
 * Public License as published by the Free Software Foundation, either
 * version 3 of the License, or (at your option) any later version.
 *
 * Revel Systems Online Ordering open source application is distributed in the
 * hope that it will be useful, but WITHOUT ANY WARRANTY; without even the
 * implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Revel Systems Online Ordering Application.
 * If not, see <http://www.gnu.org/licenses/>.
 */

define(["backbone"], function(Backbone) {
    'use strict';

    // flag for maintenance mode
    var isMaintenance;

    window.DINING_OPTION_NAME = {
        DINING_OPTION_TOGO: 'Take Out',
        DINING_OPTION_EATIN: 'Eat In',
        DINING_OPTION_DELIVERY: 'Delivery',
        DINING_OPTION_DELIVERY_SEAT: 'Deliver to Seat'
    };

    App.Routers.MainRouter = Backbone.Router.extend({
        initialize: function() {
            var self = this;

             // remove Delivery option if it is necessary
            if (!App.Data.myorder.total.get('delivery').get('enable'))
                delete DINING_OPTION_NAME.DINING_OPTION_DELIVERY;

            if (!App.Settings.eat_in_for_online_orders) {
                delete DINING_OPTION_NAME.DINING_OPTION_EATIN;
            }

            var orderFromSeat = App.Settings.order_from_seat || [];
            if(orderFromSeat[0]) {
                App.Data.orderFromSeat = {
                    enable_level: orderFromSeat[1],
                    enable_sector: orderFromSeat[2],
                    enable_row: orderFromSeat[3]
                };
                //DINING_OPTION_NAME.DINING_OPTION_TOGO = 'Pickup';
            } else {
                delete DINING_OPTION_NAME.DINING_OPTION_DELIVERY_SEAT;
            }

            if (App.Data.settings.get("skin") == App.Skins.RETAIL) {
                DINING_OPTION_NAME.DINING_OPTION_TOGO = 'Pick up in store';
                DINING_OPTION_NAME.DINING_OPTION_DELIVERY = 'Shipping';
            }

            // set page title
            pageTitle(App.Data.settings.get("settings_skin").name_app);

            // override Backbone.history.start listen to 'initialized' event
            var start = Backbone.history.start;
            Backbone.history.start = function(opts) {
                if(!self.initialized)
                    return self.on('initialized', startHistory);

                return startHistory();

                function startHistory() {
                    return start.call(Backbone.history, opts);
                }
            };

            // listen to hash changes
            this.listenTo(this, 'route', function(route, params) {
                if(App.Data.settings.get('isMaintenance'))
                    if (location.hash.slice(1) !== 'maintenance') {
                        location.reload();
                    }

                var needGoogleMaps = false,
                    cur_hash = location.hash.slice(1);

                if (this.hashForGoogleMaps)
                this.hashForGoogleMaps.some( function(hash) {
                    if (cur_hash == hash) {
                        needGoogleMaps = true;
                        return true;
                    }
                });

                if (needGoogleMaps)
                    App.Data.settings.load_geoloc();
            });
        },
        navigate: function() {
            arguments[0] != location.hash.slice(1) && App.Data.mainModel.trigger('loadStarted');
            if(App.Data.settings.get('isMaintenance') && arguments[0] != 'maintenance')
                arguments[0] = 'maintenance';
            return Backbone.Router.prototype.navigate.apply(this, arguments);
        },
        change_page: function(cb) {
            App.Data.mainModel.trigger('loadCompleted');
        },
        maintenance : function() {
            if (!App.Data.settings.get('isMaintenance')) {
                this.navigate('index', true);
                return;
            } else {
                isMaintenance = true;
            }
        },
        prepare: function(page, callback, dependencies) {
            if(isMaintenance && page != 'maintenance') return;

            var settings = App.Data.settings,
                skin = settings.get('skin'),
                settings_skin = settings.get('settings_skin'),
                skinPath = settings.get('skinPath'),
                basePath = settings.get('basePath'),
                scripts = page && Array.isArray(settings_skin.routing[page].js) ? settings_skin.routing[page].js : [],
                templates = page && Array.isArray(settings_skin.routing[page].templates) ? settings_skin.routing[page].templates : [],
                views = page && Array.isArray(settings_skin.routing[page].views) ? settings_skin.routing[page].views : [],
                css = page && Array.isArray(settings_skin.routing[page].css) ? settings_skin.routing[page].css : [],
                cssCore = page && Array.isArray(settings_skin.routing[page].cssCore) ? settings_skin.routing[page].cssCore : [],
                models = page && Array.isArray(settings_skin.routing[page].model) ? settings_skin.routing[page].model : [],
                core = page && Array.isArray(settings_skin.routing[page].core) ? settings_skin.routing[page].core : [],
                color_schemes = Array.isArray(settings_skin.color_schemes) ? settings_skin.color_schemes : [],
                system_settings = App.Data.settings.get('settings_system'),
                js = core,
                i, j;

            callback = typeof callback == 'function' ? callback.bind(this) : new Function;

            dependencies = Array.isArray(dependencies) ? dependencies : [];

            skin == App.Skins.WEBORDER && !this.prepare.initialized && initTheme.call(this);
            skin == App.Skins.RETAIL && !this.prepare.initialized && initTheme.call(this);

            for(i = 0, j = scripts.length; i < j; i++)
                js.push(skin + "/js/" + scripts[i]);

            for(i = 0, j = templates.length; i < j; i++)
                loadTemplate2(null, templates[i]);

            for(i = 0, j = views.length; i < j; i++)
                js.push(skin + "/views/" + views[i]);

            for(i = 0, j = css.length; i < j; i++)
                loadCSS(skinPath + "/css/" + css[i]);

            for(i = 0, j = cssCore.length; i < j; i++)
                loadCSS(basePath + "/css/" + cssCore[i]);

            for(i = 0, j = models.length; i < j; i++)
                js.push(skin + "/models/" + models[i]);

            require(js, function() {
                if (App.Data.loadModelTemplate && App.Data.loadModelTemplate.dfd) {
                    dependencies.push(App.Data.loadModelTemplate.dfd);
                }
                if (App.Data.loadModules) {
                    dependencies.push(App.Data.loadModules);
                }

                $.when.apply($, dependencies).then(function() {
                    callback();
                });
            });

            function initTheme() {
                var color_scheme = typeof system_settings.color_scheme == 'string' ? system_settings.color_scheme.toLowerCase().replace(/\s/g, '_') : null;
                if(color_schemes.indexOf(color_scheme) > -1) {
                    css.push('themes/' + color_scheme + '/colors');
                } else {
                    App.Data.log.pushJSError('"' + system_settings.color_scheme + '" color scheme is not available', 'js/router/main.js', '151');
                    css.push('themes/default/colors');
                }
                this.prepare.initialized = true;
            }
        },
        pay: function() {
            this.loadData().then(function() {
                App.Data.myorder.submit_order_and_pay(App.Data.myorder.checkout.get('payment_type'));
            });
        },
        loadData: function() {
            var load = $.Deferred();

            this.prepare('pay', function() {
                App.Data.card = new App.Models.Card();
                App.Data.card.loadCard();
                App.Data.customer = new App.Models.Customer();
                App.Data.customer.loadCustomer();
                App.Data.customer.loadAddresses();
                App.Data.myorder.loadOrders();
                load.resolve();
            });

            return load;
        }
    });
});