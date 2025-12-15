=== bpost-shipping-platform ===
Contributors: Bpost
Tags: shipping, multi carrier, save, automate, woocommerce
Requires at least: 4.9
Tested up to: 6.8
Requires PHP: 5.6
Stable tag: 3.2.0
Author URI: https://www.bpost.be
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Bpost for WooCommerce is a Digital Delivery Management Solution for online stores that helps you save time and money with your shipping.

== Description ==
Please note that this plugin relies on external Bpost services for shipping label generation and rate calculation.
User data (such as order details) will be sent to Bpost for processing.

Streamline your shipping process with intelligent automation. Save time using filters that automatically generate shipping labels for specific orders. Now available for both large (contract) and small (SME) plans.
Benefit from a dedicated Account Manager with a large plan and enjoy competitive rates tailored to your business needs.

Features
-Automatic creation of shipping labels
-Shipping labels for Belgium & worldwide home addresses
-Shipping labels towards Pick-up Points and Parcel lockers
-Extra options: warranty, signature and Saturday delivery in Belgium
-Follow the status of your parcels through the platform

= Screenshots =
1. Shipping zones preview
2. Order grid preview
3. Template for setting up of the bpost free shipping method
4. Template for setting up of the bpost flat rate shipping method


== External services ==

** Bpost ** - To enable you to create labels for your orders via this integration we send
shipping data (shipping address, order item list, shipping method name) to the bpost API.
https://pluginsapi.bpost.be/v3/

** Google Maps API ** - This plugin uses Google Maps API to display pickup locations on an interactive map. 
The following data is sent to Google Maps API:
- User's location (when searching for nearby pickup points)
- Pickup point addresses
- Map center coordinates

This service is used to help customers locate and select their preferred pickup points during checkout.
Google Maps API Terms of Service: https://developers.google.com/maps/terms
Google Maps API Privacy Policy: https://policies.google.com/privacy

**WooCommerce Weight Based Shipping** - if you are using this plugin, we integrate with
it so we can still send the shipping method name.

== Installation ==

Download and install the plugin from WordPress dashboard. You can also upload the entire "Bpost for WooCommerce" folder to the /wp-content/plugins/ directory.
Activate the plugin through the 'Plugins' menu in WordPress.
Go to Settings > Bpost Settings and insert your keys to get started.

== Changelog ==
= 3.2.1 - 2025-10-28 =
*fix/ version number fix
= 3.2.0 - 2025-10-28 =
*feat/ frontend functionality change for multiple checkout type and theme compatibility
= 3.1.99 - 2025-04-12 =
*fix/ fix vat display to take into account both the subtotal and tax
= 3.1.98 - 2025-07-03 =
* feat/ add coupon functionality on checkout for a valid free shipping coupon
* fix/ fix compatability issues with themes
= 3.1.97 - 2025-06-02 =
*fix/ compilation error left in class
= 3.1.96 - 2025-05-20 =
* Initial release
