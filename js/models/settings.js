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

define(["backbone", "async"], function(Backbone) {
    'use strict';

    App.Models.Settings = Backbone.Model.extend({
        initialize: function() {
            var app = require('app');
            this.get_data_warehouse(); // selection of the data warehouse
            this.set('basePath', app.config.baseUrl.replace(/\/$/, '') || '.');
            this.set('host', app.REVEL_HOST);
            this.set('hostname', /^http[s]*:\/\/(.+)/.exec(app.REVEL_HOST)[1]); //it's the host w/o "http[s]://" substring
        },
        load: function() {
            var self = this;

            this.listenTo(this, 'change:skin', this.setSkinPath, this);
            this.listenToOnce(this, 'change:settings_system', this.get_settings_main, this);
            this.listenToOnce(this, 'change:skinPath', this.get_settings_for_skin, this)

            this.get_establishment();  // get ID of current establishment

            $.ajaxSetup({
                timeout: self.get("timeout"),
                cache: true,
                success: function(data) {
                    if (!data.status) {
                        App.Data.errors.alert_red(MSG.ERROR_INCORRECT_AJAX_DATA, true);
                    } else {
                        switch (data.status) {
                            case "OK":
                                if (typeof this.successResp === 'function') {
                                    this.successResp(data.data);
                                }
                                break;
                            default:
                                App.Data.errors.alert_red(data.errorMsg, true);
                        }
                    }
                },
                error: function(xhr) {
                    App.Data.errors.alert(MSG.ERROR_SERVER_UNREACHED, true); // user notification
                },
                beforeSend: function(xhr) {
                    xhr.setRequestHeader("X-Requested-With", {
                        toString: function() {
                            return "";
                        }
                    });
                    xhr.setRequestHeader("X-Revel-Revision", self.get("x_revel_revision"));
                }
            });

            // fix for Bug 9344. Chrome v34.0.1847.131 crashes when reload page
            if(/Chrome\/34\.0\.1847\.(131|137)/i.test(window.navigator.userAgent))
                return App.Data.errors.alert(MSG.ERROR_CHROME_CRASH, true);

            // load settings system for directory app, only for maintenance page allow
            return $.when(self.get_settings_system());
        },
        defaults: {
            establishment: 1,
            host: "",
            storage_data: 0,
            skin: "", // weborder by default
            settings_skin: {},
            settings_system: {},
            timeout: 60000,
            x_revel_revision: null,
            isMaintenance: false,
            version: 1.06,
            supported_skins: []
        },
        /**
         * Selection of the data warehouse.
         */
        get_data_warehouse: function() {
            /*
            0: the data warehouse disabled;
            1: the data warehouse is "sessionStorage (HTML 5)";
            2: the data warehouse is "Cookie (HTML 4)".
            */
            try {
                   sessionStorage.private_browsing=false;
                   this.set("storage_data", 1);
            } catch(error) {
                   if (document.cookie) {
                        this.set("storage_data", 2);
                   } else {
                        this.set("storage_data", 0);
                   }
             }
        },
        /**
         * resolve app's skin
         */
        get_settings_main: function() {
            var params = parse_get_params(),
                skin = params.skin,
                settings = this.get('settings_system'),
                isUnknownSkin = !(skin && this.get('supported_skins').indexOf(skin) > -1),
                defaultSkin = settings.type_of_service == ServiceType.RETAIL ? App.Skins.RETAIL : App.Skins.DEFAULT;

            //set alias to current skin
            App.skin = isUnknownSkin ? defaultSkin : skin;

            // if device is Nexus 7 or smaller than weborder mobile version should be applied
            var isMobileVersion = App.Skins.WEBORDER_MOBILE
                && App.skin == App.Skins.WEBORDER && 'matchMedia' in window
                && (window.devicePixelRatio ? window.devicePixelRatio > 1.33 : /IEMobile/i.test(navigator.userAgent))
                && !/ipad|Nexus\s?10/i.test(navigator.userAgent)
                && cssua.userAgent.mobile
                && (matchMedia("(orientation:portrait)").matches || matchMedia("(orientation:landscape)").matches);

            if(isMobileVersion)
                App.skin = App.Skins.WEBORDER_MOBILE;

            // if RETAIL skin set delivery_charge to 0
            if(App.skin == App.Skins.RETAIL)
                settings.delivery_charge = 0;

            this.set('skin', App.skin);
        },
        /**
         * Get settings from file "settings.json" for current skin.
         */
        get_settings_for_skin: function() {
            var self = this,
                load = $.Deferred();
            $.ajax({
                url: self.get("skinPath") + "/settings.json",
                dataType: "json",
                success: function(data) {
                    var settings_skin = {};
                    settings_skin.name_app = data.name_app;
                    settings_skin.img_default = (data.img_default) ? init_img(data.img_default) : "";
                    settings_skin.styles = data instanceof Object && data.styles instanceof Array ? data.styles : [];
                    settings_skin.scripts = data instanceof Object && data.scripts instanceof Array ? data.scripts : [];
                    settings_skin.routing = data.routing;
                    settings_skin.color_schemes = data.color_schemes instanceof Array ? data.color_schemes : [];
                    self.set("settings_skin", settings_skin);
                    var default_img = self.get_img_default();
                    $("<style>.img_default { background: url('" + default_img + "'); }</style>").appendTo("head");
                },
                complete: function() {
                    load.resolve();
                }
            });

            function init_img(data) {
                if(typeof data == 'string')
                    return self.get('img_path') + data;
                else if(Array.isArray(data))
                    return data.map(function(src) {
                        return self.get('img_path') + src;
                    });
                else
                    return '';
            }

            return load;
        },
        /**
         * Get ID of current establishment.
         */
        get_establishment: function() {
            var get_parameters = parse_get_params(), // get GET-parameters from address line
                establishment = get_parameters.establishment;
            if (!isNaN(establishment))
                this.set("establishment", establishment);
        },
        /**
         * Get system setting.
         */
        get_settings_system: function() {
            var self = this,
                color_scheme_key = 'color_scheme' + this.get('establishment'),
                saved_color_scheme = getData(color_scheme_key, true),
                settings_system = {
                    address: {},
                    business_name: "",
                    email: "",
                    hide_images: false,
                    phone: "",
                    prevailing_surcharge: 0,
                    prevailing_tax: 0,
                    tax_country: "",
                    currency_symbol: "X",
                    order_notes_allow: true,
                    min_items: 1,
                    hide_products_description: false,
                    color_scheme: saved_color_scheme instanceof Object ? saved_color_scheme.color_scheme : 'default',
                    scales: {
                        default_weighing_unit: "",
                        label_for_manual_weights: "",
                        number_of_digits_to_right_of_decimal: 0
                    },
                    type_of_service: ServiceType.TABLE_SERVICE
                },
                load = $.Deferred();

            $.ajax({
                url: self.get("host") + "/weborders/system_settings/",
                data: {
                    establishment: this.get("establishment")
                },
                dataType: "json",
                success: function(response) {
                    switch (response.status) {
                        case "OK":
                            var data = response.data;

                            $.extend(true, settings_system, data);
                            settings_system.about_images = settings_system.about_images || [];
                            settings_system.about_title = settings_system.about_title || "";
                            settings_system.about_description = settings_system.about_description || "";
                            settings_system.about_access_to_location = settings_system.about_access_to_location || "";
                            // phone (begin)
                            var prefix = "";
                            if (data.phone && data.phone.indexOf("+") === -1 && data.phone !== "") {
                                prefix = "+1"; // By defaut add +1 in the beginning of the phone number
                            }

                            settings_system.phone = prefix + data.phone;
                            // phone (end)

                            var state_province = "";
                            var country = ["AF", "AM", "AR", "BE", "BG", "BO", "BY", "CA", "CL", "CN", "CO", "CR", "CU", "DM", "DZ", "EC", "ES", "FI", "FJ", "GA", "GQ", "GR", "ID", "IE", "IR", "IT", "KE", "KG", "KH", "KR", "KZ", "MG", "NL", "NO", "PA", "PE", "PG", "PH", "PK", "PL", "RU", "RW", "SA", "SB", "ST", "TH", "TJ", "TM", "TR", "UA", "UZ", "VN", "VU", "ZA", "ZM"];
                            if ($.inArray(settings_system.address.country, country) !== -1) {
                                state_province = settings_system.address.province;
                            } else {
                                state_province = settings_system.address.state;
                            }
                            state_province = (state_province === null) ? "" : state_province;
                            settings_system.address.state_province = state_province;

                            var line_2 = "";
                            if (settings_system.address.line_2 !== "") {
                                line_2 += ", " + settings_system.address.line_2;
                            }

                            var full_address = settings_system.address.line_1 +
                                               line_2 + ", " +
                                               settings_system.address.city + ", " +
                                               settings_system.address.state_province + " " +
                                               settings_system.address.postal_code;

                            settings_system.address.full_address = $.trim(full_address);

                            settings_system.address.coordinates = {};
                            settings_system.address.getRegion = function() {
                                return $.inArray(settings_system.address.country, country) !== -1
                                    ? settings_system.address.province
                                    : settings_system.address.state;
                            };

                            var srvDate = new Date(settings_system.server_time);
                            var clientDate = new Date();

                            //create the delta in ms. between server and client by time_zone shift:
                            if (!settings_system.time_zone_offset) settings_system.time_zone_offset = -(new Date()).getTimezoneOffset() * 60 * 1000;
                            settings_system.server_time = settings_system.time_zone_offset * 1000 + (new Date()).getTimezoneOffset() * 60 * 1000;
                            //add the delta in ms. between server and client times set:
                            settings_system.server_time +=  srvDate.getTime() - clientDate.getTime();
                            settings_system.geolocation_load = $.Deferred();

                            // fix for bug 7233
                            if(settings_system.delivery_for_online_orders) {
                                if(!(settings_system.delivery_charge >= 0))
                                    settings_system.delivery_charge = 0;
                                if(!(settings_system.estimated_delivery_time >= 0))
                                    settings_system.estimated_delivery_time = 0;
                                if(!(settings_system.max_delivery_distance >= 0))
                                    settings_system.max_delivery_distance = 0;
                                if(!(settings_system.min_delivery_amount >= 0))
                                    settings_system.min_delivery_amount = 0;
                            }

                            if (settings_system.auto_bag_charge < 0)
                                settings_system.auto_bag_charge = 0;

                            setData(color_scheme_key, new Backbone.Model({color_scheme: settings_system.color_scheme}), true);

                            settings_system.scales.number_of_digits_to_right_of_decimal = Math.abs((settings_system.scales.number_of_digits_to_right_of_decimal).toFixed(0) * 1);

                            self.set("settings_system", settings_system);
                            App.Settings = App.Data.settings.get("settings_system");
                            if (!self.get_payment_process()) {
                                console.log("payment processor not found");
                                self.set('isMaintenance', true);
                            }
                            break;
                        case 'DISALLOW_ONLINE':
                            recoverColorScheme();
                            console.log('online and app orders unchecked');
                            self.set('isMaintenance', true);
                            break;
                        default:
                            App.Data.errors.alert_red(response.errorMsg, true);
                            recoverColorScheme();
                    }

                    function recoverColorScheme() {
                        self.set("settings_system", {color_scheme: settings_system.color_scheme});
                    }
                },
                error: function() {
                    self.set({
                        settings_system: settings_system, // default settings
                        isMaintenance: true
                    });
                },
                complete: function() {
                    load.resolve();
                }
            });
            return load;
        },
        load_geoloc: function() {
            var self = this,
                set_sys = App.Data.settings.get("settings_system"),
                address_google = set_sys.address.city +  ", " +
                                 set_sys.address.state_province + " " +
                                 set_sys.address.postal_code + ", " +
                                 set_sys.address.country + ", " +
                                 set_sys.address.line_1;

                if (set_sys.geolocation_load.state() == 'resolved') {
                    return;
                }

                require(["async!https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=true"], function() {
                    var geocoder = new google.maps.Geocoder();
                    geocoder.geocode({"address": address_google}, function(results, status) {
                        if (status === google.maps.GeocoderStatus.OK) {
                            var location = results[0]['geometry']['location'];
                            $.extend(set_sys.address.coordinates, {lat: location.lat(), lng: location.lng()});
                            set_sys.geolocation_load.resolve();
                        } else {
                            set_sys.geolocation_load.reject();
                        }
                    });
                });
        },
        get_payment_process: function() {
            var settings_system = this.get('settings_system'),
                processor = settings_system.payment_processor;

            var skin = this.get("skin");

            if ((skin === 'weborder' || skin === 'weborder_mobile') && !processor.usaepay && !processor.mercury && !processor.paypal && !settings_system.accept_cash_online) {
                return undefined;
            }

            var credit_card_button = (processor.paypal && processor.paypal_direct_credit_card) || processor.usaepay || processor.mercury;
            var credit_card_dialog = (processor.paypal && processor.paypal_direct_credit_card) || processor.usaepay;
            var payment_count = 0;
            processor.paypal && payment_count++;
            if((processor.paypal && processor.paypal_direct_credit_card) || processor.usaepay || processor.mercury) {
                payment_count++;
            }
            processor.cash && payment_count++;

            return Backbone.$.extend(processor, {
                cash: settings_system.accept_cash_online,
                payment_count: payment_count,
                credit_card_button: credit_card_button,
                credit_card_dialog: credit_card_dialog
            });
        },
        get_img_default: function(index) {
            var img = this.get('settings_skin').img_default;
            if(typeof img == 'string') {
                return img;
            } else if(Array.isArray(img)) {
                index = index && Object.keys(img).indexOf(index.toString()) > -1 ? index : 0;
                return img[index];
            } else {
                return '';
            }
        },
        saveSettings: function() {
            setData('settings', this);
        },
        loadSettings: function() {
            this.set('settings_system', getData('settings').settings_system);
        },
        setSkinPath: function() {
            var skinPath = this.get('basePath') + '/skins/' + this.get('skin');
            this.set({
                img_path: skinPath + '/img/',
                skinPath: skinPath
            });
        }
    });
});