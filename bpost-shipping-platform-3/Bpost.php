<?php
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * Plugin Name: bpost-shipping-platform
 * Description: bpost-shipping-platform
 * Version: 3.2.1
 * Author: bpost
 * Author URI: https://www.bpost.be/
 * License: GPLv2 or later
 * Text Domain: bpost-shipping-platform
 * @package bpost
 *
 * Woo: 12345:342928dfsfhsf8429842374wdf4234sfd
 * WC requires at least: 3.0.0
 * WC tested up to: 5.5.0
 *
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

$plugin_url = plugin_dir_url( __FILE__ );
# Get rid of the protocol entirely
$plugin_url = preg_replace('/https?\:/', '', $plugin_url );

define( 'BPOST_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );
define( 'BPOST_PLUGIN_FILE',  __FILE__ );
define( 'BPOST_PLUGIN_URL',  $plugin_url );
define( 'BPOST_LOGO', BPOST_PLUGIN_URL.'assets/images/logo.svg');

require_once(BPOST_PLUGIN_PATH .'/constants.php');
require_once(BPOST_PLUGIN_PATH .'includes/class-woo-Bpost.php');


add_action(
    'before_woocommerce_init',
    function() {
        // Check if the FeaturesUtil class exists in the \Automattic\WooCommerce\Utilities namespace.
        if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
            // Declare compatibility with custom order tables using the FeaturesUtil class.
            \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
        }
    }
);


/**
 * Marketplace have special needs, vendors have their own keys and the owner of the site might not
 * have a contract with BPOST
 * @return true if a marketplace we integrate with is installed
 */
function BPOST_is_marketplace() {
    global $BPOST_wcfm, $BPOST_dokan;
    return isset($BPOST_wcfm) || isset($BPOST_dokan);
}

// Only initialize once - check if we've already initialized
if (!defined('BPOST_INITIALIZED')) {
    define('BPOST_INITIALIZED', true);
    $Bpost = BpostWoo::instance();
    $Bpost->bootstrap();
}
