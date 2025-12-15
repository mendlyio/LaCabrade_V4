<?php
/**
 * Woo Bpost
 * specific woo stuff should be bootstraped here
 *
 * @package Bpost
 * @since   1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly
include_once (BPOST_PLUGIN_PATH.'/includes/core/class-Bpost.php');
include_once (BPOST_PLUGIN_PATH.'/includes/core/class-Bpost-api-v3.php');
include_once (BPOST_PLUGIN_PATH.'/includes/class-woo-Bpost-order.php');
include_once (BPOST_PLUGIN_PATH.'/includes/core/BpostOptions.php');
include_once (BPOST_PLUGIN_PATH.'includes/admin/class-Bpost-shipping.php');
include_once (BPOST_PLUGIN_PATH.'includes/plugins/class-Bpost-connector.php');
include_once (BPOST_PLUGIN_PATH.'includes/plugins/class-Bpost-marketplace.php');

/**
 * Main Bpost class
 * @class BpostWoo
 */
class BpostWoo extends BpostV3 {

    /**
     * Bpost version
     *
     * @var string
     */
    public static $version = BPOST_VERSION;

    public static $provinces = array(
        'ES' => array(
            'CN' => 'Canarias'
        ),
        'PT' => array(
            'IL' => 'Ilhas',
            'CT' => 'Continente'
        )
    );

    /**
     * Data version - the datamodel version
     */
    public static $data_version = '1';

    /**
     * The single instance
     *
     * @var Bpost
     * @since 1.0.0
     */
    protected static $_instance = null;

    /**
     * is this one of our test machines
     **/
    public static $is_dev = false;

    /**
     * The app class for woo
     *
     * @var Number
     */
    public static $BPOST_WOOCOMMERCE = BPOST_APP_KEY;

    /**
     * We use this to know if the user changed the keys
     */
    public static $OPTION_BPOST_CACHE_KEY = 'Bpost_cache_key';
    public static $OPTION_BPOST_PUBLIC_KEY = 'Bpost_public_key';
    public static $OPTION_BPOST_PRIVATE_KEY = 'Bpost_private_key';
    public static $OPTION_PRIVATE_KEY = 'Bpost_private_key';
    public static $OPTION_CALLBACK_URL = 'Bpost_callbackurl';
    public static $OPTION_BPOST_TOKEN = 'Bpost_token';
    public static $OPTION_BPOST_TOKEN_EXPIRES = 'Bpost_token_expires';
    public static $OPTION_BPOST_USEWPAPI = 'Bpost_usewpapi';

    protected $known_issues  = [];

    /**
     * Private constructor to enforce Singleton pattern.
     */
    private function __construct(){
        global $wpdb;

        $this->db_prefix = $wpdb->prefix;
    }

    /**
     * Singleton pattern ensures only one Bpost instance
     * @since 1.0.0
     * @see Bpost()
     * @return Bpost - Main instance.
     */
    public static function instance() {
        if ( is_null( self::$_instance ) ) {
            self::$is_dev = defined('BPOST_DEV');
            self::$_instance = new self();
            self::Bpost_check_upgrade();
        }
        return self::$_instance;
    }

    /**
     * Track if bootstrap has already been called
     */
    private static $bootstrapped = false;

    /**
     * Initialize the plugin, register hooks and actions.
     */
    public function bootstrap() {
        // Prevent multiple bootstrap calls
        if (self::$bootstrapped) {
            return;
        }
        self::$bootstrapped = true;

        register_activation_hook(BPOST_PLUGIN_FILE, array($this, 'activate'));
        register_deactivation_hook(BPOST_PLUGIN_FILE, array($this, 'deactivate'));
        BpostShipping::get_instance();

        $active_plugins = (array) get_option( 'active_plugins', array() );
        if ( is_multisite() ) {
            $network_activated_plugins = array_keys( get_site_option( 'active_sitewide_plugins', array() ) );
            $active_plugins            = array_merge( $active_plugins, $network_activated_plugins );
        }

        if ( !in_array( 'woocommerce/woocommerce.php', $active_plugins ) ) {
            add_action( 'admin_notices', array( $this, 'notice_wc_required' ) );
            return;
        }

        if( ! $this->is_options_valid() && !Bpost_is_marketplace() ) {
            add_action( 'admin_notices', array( $this, 'notice_incomplete_options' ) );
        }

        $this->admin_includes();
        $this->actions();
        $this->filters();
    }

    /**
     * Detect and warn the user about known incompatibilities
     */
    public function known_issues() {
        global $Bpost;

    }

    /**
     * Check if all the mandatory options are set
     *
     * @return bool - true if all required options are set
     * @override
     */
    public function is_options_valid(){
        $username = sanitize_text_field(get_option('Bpost_public_key'));
        $password = sanitize_text_field(get_option('Bpost_private_key'));

        return $username && $password;
    }

    /**
     * Activate the plugin and update necessary options.
     * @param $network_wide - if it's a network WordPress install, denotes install for the entire network
     */
    public static function activate($network_wide) {
        global $wpdb;

        $database_version = get_option('Bpost_db_version');
        self::log("Activating " . (is_multisite() ? 'multisite' : 'regular') . " network_wide:  " . absint($network_wide) . " current_db " . sanitize_text_field($database_version) . "plugindb " . sanitize_text_field(self::$database_version));

        if($database_version < self::$database_version) {
            if ( is_multisite() && $network_wide ) {
                foreach (get_sites( ['fields'=>'ids'] ) as $blog_id) {
                    switch_to_blog(absint($blog_id));

                    self::log("Activating site: " . esc_url(site_url()));

                    $Bpost = BpostWoo::instance();
                    $Bpost->db_prefix = $wpdb->prefix;
                    BpostWoo::_active_site($network_wide);
                    restore_current_blog();
                }
            } else {
                BpostWoo::_active_site($network_wide);
            }
            update_option( 'Bpost_db_version', self::$database_version );
        }
    }

    /**
     * Activate a single website in the network.
     */
    private static function _active_site($network_wide) {
        self::callback_url();

        $Bpost = BpostWoo::instance();
        $Bpost->create_Bpost_data_model('bigint(20) unsigned ');
//        BpostMarketplace::activate($network_wide);
    }

    /**
     * Generic plugin actions.
     *
     * @return void
     */
    public function actions() {
        add_action( 'plugins_loaded', array( $this,'plugins_loaded' ) );

        add_action( 'upgrader_process_complete', array( $this,'upgrade_function' ) ,10, 2);

        add_action('admin_enqueue_scripts', array( $this, 'Bpost_admin_styles' ) );
        add_action('admin_enqueue_scripts', array( $this, 'Bpost_admin_scripts' ) );

        add_action( 'wp_enqueue_scripts', array( $this, 'Bpost_scripts' ) );
        add_action( 'admin_init', array( $this, 'known_issues' ) );
        add_action( 'admin_notices', array( $this, 'notice_list' ) );

        add_action('parse_request', array( $this,'parse_request' ) );
        add_filter('query_vars', array( $this,'custom_query_vars' ) );

        add_action( 'rest_api_init', array( $this,'register_api_routes' ) );
        add_action('init', 'BpostWoo::callback_url');
        add_action('template_redirect', [$this,'handle_update_settings']);

        $autoexport_status = sanitize_text_field(get_option('Bpost_autoexport'));
        if( strlen($autoexport_status) > 0 ){
            $status_name  = sanitize_text_field(str_replace('wc-', '', $autoexport_status));
            $action_name = 'woocommerce_order_status_' . $status_name;
            add_action( $action_name , array($this, 'auto_export'));
        }
        
        // HS Code functionality hooks
        add_action('init', array($this, 'init_hs_code_attribute'));
        add_action('woocommerce_product_options_general_product_data', array($this, 'add_hs_code_admin_field'));
        add_action('woocommerce_process_product_meta', array($this, 'save_hs_code_admin_field'));

        // Country of Origin functionality hooks
        add_action('woocommerce_product_options_general_product_data', array($this, 'add_country_of_origin_admin_field'));
        add_action('woocommerce_process_product_meta', array($this, 'save_country_of_origin_admin_field'));
    }

    /**
     * Handle update settings action.
     */
    public function handle_update_settings() {
        $respdata = new stdClass();

        // Check if POST request has data
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST)) {

            // Sanitize and decode the JSON data from 'data' field in POST (assuming it's sent this way)
            $raw_data = isset($_POST['data']) ? sanitize_text_field(wp_unslash($_POST['data'])) : '';
            $data = json_decode($raw_data);

            // Define the statuses
            $statuses = [
                0 => '',
                1 => 'wc-pending',
                2 => 'wc-processing',
                3 => 'wc-on-hold',
                4 => 'wc-completed',
                5 => 'wc-cancelled',
                6 => 'wc-refunded',
                7 => 'wc-failed',
            ];

            // Check action and hash match
            if (isset($data->action) && sanitize_text_field($data->action) == "update" && $data->hash == $this->get_request_signature()) {
                // Update options based on the sanitized input
                update_option('Bpost_autoexport', sanitize_text_field($statuses[$data->exportstatus]));
                update_option('Bpost_labelagree', 1);
                update_option('Bpost_hide_not_free', 0);
                update_option('Bpost_export_virtual_products', 1);

                // Prepare response data
                $respdata->msg = "update done";
                $respdata->settings = array(
                    'Bpost_maps_key' => sanitize_text_field(get_option('Bpost_maps_key')),
                    'Bpost_pickupdisable' => sanitize_text_field(get_option('Bpost_pickupdisable')),
                    'Bpost_labelagree' => sanitize_text_field(get_option('Bpost_labelagree')),
                    'Bpost_autoexport' => sanitize_text_field(get_option('Bpost_autoexport')),
                    'Bpost_hide_not_free' => sanitize_text_field(get_option('Bpost_hide_not_free')),
                    'Bpost_export_virtual_products' => sanitize_text_field(get_option('Bpost_export_virtual_products')),
                    'Bpost_export_virtual_orders' => sanitize_text_field(get_option('Bpost_export_virtual_orders')),
                );

                // Send the response as JSON
                die(wp_json_encode($respdata));
            }
        }
    }



    private function get_request_signature()
    {
        $hmac256 = hash_hmac('sha256', get_option('Bpost_private_key'), true);
        return base64_encode($hmac256);
    }

    /**
     * Actions to perform after all plugins are loaded.
     */
    public function plugins_loaded() {
        $this->check_marketplaces();
        $this->load_plugin_textdomain();
    }

    /**
     * Check if marketplace plugins are active and include necessary files.
     */
    public function check_marketplaces() {
        global $Bpost_dokan,$Bpost_wcfm;

        $active_plugins =  apply_filters('active_plugins', get_option( 'active_plugins' ));
        if ( in_array( 'dokan-lite/dokan.php', $active_plugins )) {
            require_once(BPOST_PLUGIN_PATH . 'includes/plugins/class-Bpost-dokan.php');
        }

        if (in_array('wc-multivendor-marketplace/wc-multivendor-marketplace.php', $active_plugins)) {
            require_once(BPOST_PLUGIN_PATH . 'includes/plugins/class-Bpost-wcfm.php');
        }
    }

    /**
     * Handle plugin upgrade and call necessary functions.
     *
     * @param WP_Upgrader $upgrader_object
     * @param array $options
     */
    public function upgrade_function( $upgrader_object, $options ) {
        global $Bpost;

        $current_plugin_path_name = plugin_basename( __FILE__ );

        if ($options['action'] == 'update' && $options['type'] == 'plugin' ){
            if(isset($options['plugins'])){
                foreach($options['plugins'] as $each_plugin){
                    if ($each_plugin == $current_plugin_path_name){
                        self::Bpost_check_upgrade();
                    }
                }
            }
        }
    }

    /**
     * Load plugin text domain for translations.
     */
    public function load_plugin_textdomain() {
        global $Bpost;

        load_plugin_textdomain( 'Bpost-for-woocommerce', false, basename( dirname( __FILE__ ) ) . '/languages/' );
    }

    /**
     * Automatically export orders when the specified WooCommerce order status is reached.
     *
     * @param int $order_id
     */
    public function auto_export($order_id) {
        global $wpdb;

        error_log("Auto export order_id: $order_id ");

        $query = $wpdb->prepare("SELECT status FROM {$wpdb->prefix}Bpost WHERE id = %d", $order_id);

        // phpcs:ignore
        $exported = $wpdb->get_results($query);

        self::log("Exported " . var_export($exported,true));

        if (!$exported || ($exported[0]->status != BpostOrder::$STATUS_EXPORTED_SUCCESSFULLY) ) {
            self::log("Order not status of exported, order id is: " .$order_id);
            BpostWooOrder::export(array($order_id));
        } else if( self::$is_dev) {
            self::log("order $order_id was already exported status is $exported[0]->status:  ignore");
        }
    }

    /**
     * Append filters to WooCommerce.
     */
    public function filters() {
        add_filter('woocommerce_order_details_after_order_table_items', array($this,'print_pickup_label'));

        /**
         * Add spanish special zones like canary islands
         */
        add_filter( 'woocommerce_states', array($this, 'add_states') );

        add_filter( 'woocommerce_package_rates', array( $this, 'rates_filter'), 10, 2 );
    }

    /**
     * Validate shipping rate.
     *
     * @param WC_Shipping_Rate $r
     * @param array $package
     * @return bool
     */
    public function is_rate_valid( $r , $package ) {
        $options = get_option( 'woocommerce_' . $r->method_id . '_' . $r->instance_id . '_settings' );

        // Check if `excludeclasses` exists
        if( isset( $options['excludeclasses'] ) && $options['excludeclasses'] ) {
            BpostWoo::log( $r->label );
            $opt_exclude_classes = explode( ',', $options['excludeclasses'] );
            $contains_classes_to_exclude = false;

            // Check if the package contains products that have at least one of the selected classes
            foreach ( $package['contents'] as $key => $item ) {
                foreach ( $opt_exclude_classes as $c2exclude ) {
                    $terms = get_the_terms( $item['product_id'], 'product_shipping_class' );
                    if ( $terms ) {
                        foreach( $terms as $term ) {
                            $contains_classes_to_exclude |=  $term->term_id == $c2exclude;
                        }
                    }
                }
            }

            BpostWoo::log("contains class " . ( $contains_classes_to_exclude ? 1 : 0 ));
            if ( $contains_classes_to_exclude ) {
                return false; // Exclude if it contains the class
            }
        }
        // Check if `min_amount` is set and valid
        if (isset($options['requires']) && $options['requires'] == 'min_amount' &&  isset( $options['min_amount'] ) && !empty( $options['min_amount'] ) ) {

            $min_amount = $options['min_amount']; // Convert string "2,00" to float
            $cart = WC()->cart;
            
            // Get subtotal and tax separately, then format properly using WooCommerce functions
            $subtotal = $cart->get_subtotal();
            $subtotal_tax = $cart->get_subtotal_tax();
            
            // Use WooCommerce's proper formatting to match what's displayed on frontend
            $total_with_tax = wc_format_decimal( $subtotal + $subtotal_tax, wc_get_price_decimals() );
            $min_amount_formatted = wc_format_decimal( $min_amount, wc_get_price_decimals() );


            BpostWoo::log("Min amount: " . $min_amount_formatted . ", Cart subtotal with tax: " . $total_with_tax);

            if ( (float) $total_with_tax < (float) $min_amount_formatted ) {

                BpostWoo::log("Cart subtotal with tax is below the minimum amount, excluding shipping method.");
                return false; // Exclude if cart subtotal with tax is less than the minimum amount
            }
        }
        if( isset( $options['max_amount'] ) && !empty( $options['max_amount'] ) ){
            $max_amount = $options['max_amount'];
            $cart = WC()->cart;
            
            // Get subtotal and tax separately, then format properly using WooCommerce functions
            $subtotal = $cart->get_subtotal();
            $subtotal_tax = $cart->get_subtotal_tax();
            
            // Use WooCommerce's proper formatting to match what's displayed on frontend
            $total_with_tax = wc_format_decimal( $subtotal + $subtotal_tax, wc_get_price_decimals() );
            $max_amount_formatted = wc_format_decimal( $max_amount, wc_get_price_decimals() );

            BpostWoo::log("Max amount: " . $max_amount_formatted . ", Cart subtotal with tax: " . $total_with_tax);

            if ( (float) $total_with_tax >= (float) $max_amount_formatted ) {

                BpostWoo::log("Cart subtotal with tax is above the maximum amount, excluding shipping method.");
                return false; // Exclude if cart subtotal with tax is above the maximum amount
            }
        }

        if (isset($options['requires']) && $options['requires'] == 'coupon') {
            $has_free_shipping_coupon = false;
            $applied_coupons = WC()->cart->get_applied_coupons();

            foreach ($applied_coupons as $coupon_code) {
                $coupon = new WC_Coupon($coupon_code);
                if ($coupon->get_free_shipping()) {
                    $has_free_shipping_coupon = true;
                    break;
                }
            }

            if (!$has_free_shipping_coupon) {
                BpostWoo::log("No free shipping coupon applied, excluding shipping method.");
                return false;
            }
        }

        return true; // Shipping method is valid
    }

    /**
     * Filter and return valid shipping rates.
     *
     * @param array $rates
     * @param array $package
     * @return array
     */
    public function rates_filter ( $rates, $package ) {
        $free_not_local = false;
        
        if ( get_option('Bpost_hide_not_free') ) {
            $free = array();

            foreach ( $rates as $id => $r) {

                if ( $r->cost == 0 && $this->is_rate_valid( $r, $package ) ) {

                    $free_not_local |= ($r->method_id != 'local_pickup');

                    $free[$id] = $r;

                }

            }

            if ( !empty( $free ) && $free_not_local) {
                $rates = $free;
            }
        }

        $newrates = array();
        foreach ( $rates as $id => $r) {

            $hasPickup = $this->check_if_has_pickup_safe(rate: $r);
           
            $hasPickup['status'] ? $r->add_meta_data( 'has_pickup', 1, true ) : null;
            $hasPickup['is_international'] ? $r->add_meta_data( 'is_international', 1, true ) : false;
            ($hasPickup['status'] && $hasPickup['pickupMandatory']) ? $r->add_meta_data( 'pickup_mandatory', 1, true ) : null;

            if ( $r->cost == 0 && $this->is_rate_valid( $r, $package ) ) {
                $free_not_local |= ($r->method_id != 'local_pickup');
                $free[$id] = $r;
            }

            if( $this->is_rate_valid($r, $package) ) {
                $newrates[$id] = $r ;
            }
        }
        return $newrates;
    }

    public function check_if_has_pickup($rate){

        $Bpost_shipping = BpostShipping::get_instance();

        return $Bpost_shipping->ajax_get_selected_carrier_react($rate->get_id());

    }

    public function check_if_has_pickup_safe($rate){
        $carrierId = $rate->get_id();
        if (!$carrierId) {
            return ['status' => 0, 'pickupMandatory' => false];
        }

        // Construct option name from carrier ID (e.g., shipping_Bpost_30:7 -> woocommerce_shipping_Bpost_30_7_settings)
        $carrier_id_formatted = str_replace(':', '_', $carrierId);
        $option_name = 'woocommerce_' . $carrier_id_formatted . '_settings';
        $settings = get_option($option_name);

        if (!$settings) {
            return ['status' => 0, 'pickupMandatory' => false];
        }

        // Extract carrier ID number for response
        preg_match('/\d+/', $carrierId, $matches);
        $carrier_id_number = $matches[0] ?? null;

        if (!$carrier_id_number) {
            return ['status' => 0, 'pickupMandatory' => false];
        }

        // Get carrier object and check if pickup is available
        $Bpost_shipping = BpostShipping::get_instance();
        $carrier = $Bpost_shipping->get_Bpost_carrier($carrierId);
        $hasPickup = BpostShipping::is_carrier_pickup_able($carrier);

        if (!$hasPickup) {
            return ['status' => 0, 'pickupMandatory' => false];
        }

        // Build response based on settings
        $response = ['status' => 1, 'carrier_id' => $carrier_id_number, 'pickupMandatory' => false];

        // Check pickup behavior from settings - prioritize service_level for bpost
        if (isset($settings['service_level'])) {
            $response['service_level'] = $settings['service_level'];
            $response['is_international'] = false;
            $mandatory_service_levels = [301, 307, 'BPSML02', 'BPSML04'];
            $international_service_levels = [307, 'BPSML04'];
            
            // Check if this is an international service level
            if (in_array($settings['service_level'], $international_service_levels)) {
                $response['is_international'] = true;
            }
            
            if (in_array($settings['service_level'], $mandatory_service_levels)) {
                $response['pickupMandatory'] = true;
                $response['status'] = 1; // Show pickup
            } else {
                $response['status'] = 0; // Don't show pickup for other service levels
            }
        } elseif (isset($settings['pickupbehaviour'])) {
            // Fallback to pickupbehaviour setting if service_level not set
            if ($settings['pickupbehaviour'] == BpostWooOrder::$PICKUP_BEHAVIOUR_MANDATORY) {
                $response['pickupMandatory'] = true;
                $response['status'] = 1;
            } elseif ($settings['pickupbehaviour'] == BpostWooOrder::$PICKUP_BEHAVIOUR_IMPOSSIBLE) {
                $response['pickupMandatory'] = false;
                $response['status'] = 0;
            } else {
                // Optional pickup behaviour
                $response['pickupMandatory'] = false;
                $response['status'] = 1;
            }
        } else {
            // Default: no pickup available
            $response['status'] = 0;
        }
        
        return $response;
    }

    /**
     * Add custom states to WooCommerce.
     *
     * @param array $states
     * @return array
     */
    public function add_states ($states) {
        if( !get_option('Bpost_provinces',false)){
            return $states;
        }

        foreach ( BpostWoo::$provinces as $country => $values){
            foreach ($values as $code => $name) {
                $states[$country][$code] = esc_html($name);
            }
        }
        return $states;
    }

    /**
     * Parse custom query variables.
     *
     * @param WP $wp
     */
    public function parse_request( $wp ='' ) {
        if( !empty( $wp->query_vars['Bpost_update'] ) ) {
            $this->api_update();
        }

        if( !empty( $wp->query_vars['Bpost_create_account'] ) ) {
            $this->create_account();
        }

//        if( !empty($wp->query_vars['Bpost_request_account'] ) && Bpost_is_marketplace() ) {
//            BpostMarketplace::instance()->request_account();
//        }
    }

    /**
     * Handle API update requests.
     */
    public function api_update() {
        // Set the response type to JSON
        header("Content-Type:application/json");

        // Check if POST request has data
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && (!empty($_POST) || file_get_contents("php://input"))) {

            // Assume that 'data' field in POST contains the raw JSON data
            $raw_data = isset($_POST['data']) ? sanitize_text_field(wp_unslash($_POST['data'])) : file_get_contents("php://input");

            error_log("APIUPDATE");

            // If no content is present, return an error message
            if (!trim($raw_data)) {
                die(wp_json_encode((object)array("Error" => "No content")));
            }

            // Decode the JSON data
            $data = json_decode($raw_data);


            // Trigger the action with the decoded data
            do_action('Bpost_api_update', $data);

            // Get callback URL and API instance
            $url = self::get_callback_url();
            $api = self::get_api();

            // Validate the update request
            if (!$api->validate_update_request($data->Status, $data->TrackingId, $url, $data->Hash)) {
                self::log("RESTAURE!! API_UPDATE INVALID SIGNATURE IGNORING ");
                die(wp_json_encode((object)array("Error" => "Invalid Signature")));
            }

            // Handle the 'getshippingmethods' action
            if (isset($data->Action) && sanitize_text_field($data->Action) == 'getshippingmethods') {
                echo wp_kses(BpostShipping::get_shipping_methods());
                die();
            }

            // Handle the order update
            $order = new BpostWooOrder(absint($data->ShopItemId));
            if ($data->Status) {
                $order->set_status_from_api(sanitize_text_field($data->Status));
            }

            if ($data->TrackingId) {
                $order->set_tracking_id(sanitize_text_field($data->TrackingId), sanitize_text_field($data->TrackingUrl));
            }

            // Send a JSON response indicating the update was successful
            die("{\"msg\":\"update done\"}");
        } else {
            // If no data is available in POST, return an error message
            die(wp_json_encode((object)array("Error" => "No POST data received")));
        }
    }


    /**
     * Register API routes.
     */
    public function register_api_routes() {
        register_rest_route( 'Bpost/v1', '/update', array(
            'methods'  => WP_REST_Server::CREATABLE,
            'callback' => array($this, 'api_update'),
            'permission_callback' => '__return_true',
        ) );

        register_rest_route( 'Bpost/v1', '/update', array(
            'methods'  => WP_REST_Server::READABLE,
            'callback' => array($this, 'api_update'),
            'permission_callback' => '__return_true',
        ) );
    }

    /**
     * Define callback URL and flush rewrite rules if needed.
     */
    public static function callback_url() {
        global $wp_rewrite;

        if(!$wp_rewrite || get_option(self::$OPTION_BPOST_USEWPAPI)){
            return;
        }

        $rules = get_option( 'rewrite_rules' );

        // Check if the main callback rule already exists
        if ( !$rules || isset( $rules['^Bpost-callback/?'] ) ) {
            return;
        }

        BpostWoo::log("Add route for Bpost callback ");
        add_rewrite_rule(
            '^Bpost-callback/?',
            'index.php?Bpost_update=1',
            'top'
        );

        $wp_rewrite->flush_rules( true );
    }

    /**
     * Add custom query variables.
     *
     * @param array $vars
     * @return array
     */
    public function custom_query_vars($vars) {
        $vars[] = 'Bpost_update';
        $vars[] = 'Bpost_create_account';
        $vars[] = 'Bpost_request_account';
        return $vars;
    }

    /**
     * Enqueue frontend scripts and styles.
     */
    public function Bpost_scripts() {
        if(get_option('Bpost_pickupdisable') && !Bpost_is_marketplace()){
            return;
        }

        if (is_checkout()){
            
            wp_register_script('Bpost_script' , BPOST_PLUGIN_URL.'assets/js/Bpost.js', array ( 'customize-preview','jquery' ),'2.2',['in_footer' => true] );
            wp_enqueue_script( 'Bpost_script');
            wp_localize_script('Bpost_script', 'Bpost_vars', ['nonce' => wp_create_nonce('nonce')]);


            wp_register_style( 'Bpost_style', BPOST_PLUGIN_URL.'assets/css/Bpost.css',[],'1.0.0' );
            wp_enqueue_style( 'Bpost_style' );
            
            wp_register_style( 'checkout_style', BPOST_PLUGIN_URL.'assets/css/checkout.css',[],'1.0.0' );
            wp_enqueue_style( 'checkout_style' );

            wp_register_script('Bpost_connect' , BPOST_PLUGIN_URL.'assets/js/connect.js' ,[],'1.0.0',['in_footer' => true]);
            wp_enqueue_script( 'Bpost_connect');

        }

        wp_enqueue_script('jquery');
    }

    /**
     * Enqueue admin styles.
     */
    public function Bpost_admin_styles() {
        wp_register_style( 'Bpost_admin_styles', BPOST_PLUGIN_URL.'assets/css/Bpost-admin.css', array(), '1.1');
        wp_enqueue_style( 'Bpost_admin_styles' );
    }

    /**
     * Enqueue admin scripts.
     */
    public function Bpost_admin_scripts( ) {
        wp_register_script('Bpost_admin_script' , BPOST_PLUGIN_URL.'assets/js/Bpost-admin.js', array ( 'jquery' ), '1.0.3' );
        wp_enqueue_script( 'Bpost_admin_script');
        wp_localize_script('Bpost_admin_script', 'Bpost_ajax_object', ['nonce' => wp_create_nonce('label_print_nonce')]);
    }

    /**
     * Deactivate the plugin.
     *
     * @return void
     */
    public static function deactivate() {
    }

    /**
     * Uninstall the plugin.
     *
     * @return void
     */
    public static function uninstall() {

    }

    /**
     * Clear Bpost data on uninstall.
     *
     * @return void
     */
    public static function clear_Bpost_data(){
        $Bpost = new BpostWoo();
        $Bpost->drop_Bpost_data_model();
    }

    /**
     * Display welcome message upon installation.
     *
     * @return void
     */
    public function welcome() {
        if (!get_option('Bpost_version')) {
            add_option( 'Bpost_version', BpostWoo::$version );
            wp_safe_redirect();
        }
    }

    /**
     * Include admin-related files.
     */
    public function admin_includes() {
        if( is_admin() ){
            include_once ( BPOST_PLUGIN_PATH . 'includes/admin/class-Bpost-order-ui.php' );
            include_once ( BPOST_PLUGIN_PATH . 'includes/admin/class-Bpost-options-ui-default.php' );
        }
    }

    /**
     * Display notices about known issues.
     */
    public function notice_list() {
        if(! count($this->known_issues) ){
            return;
        }
        ?>
        <div class='notice notice-warning'>
            <?php
            foreach($this->known_issues as $notice){
                echo  "<p>" . esc_html($notice) . "</p>";
            }
            ?>
        </div>
        <?php
    }

    /**
     * Notify the user to set Bpost credentials.
     *
     * @return void
     */
    public function notice_incomplete_options() {
        ?>
        <div class="notice notice-error">
            <p>
                <?php echo esc_html($this->translate('To use Bpost you must '));?>
                <a href="<?php echo esc_url(admin_url('options-general.php?page=Bpost-settings'));?>"><?php echo esc_html($this->translate('set your credentials'))?></a>
            </p>
        </div>
        <?php
    }

    /**
     * Notify the user that WooCommerce is required.
     *
     * @return void
     */
    public function notice_wc_required() {
        ?>
        <div class="error">
            <p><?php echo esc_html($this->translate( 'Bpost requires WooCommerce to be installed and activated!' )); ?></p>
        </div>
        <?php
    }

    /**
     * Display pickup label after order details in WooCommerce.
     *
     * @param WC_Order $order
     * @return void
     */
    public function print_pickup_label($order) {
        global $Bpost;

        $order = new BpostWooOrder($order->get_id());
        $wc_order = wc_get_order($order->get_id());

        $meta = $order->get_order_meta();

        if($meta && $meta->pickup_id){
            echo '<tr><td>' . esc_html($Bpost->translate("Pickup Point")) . '</td><td>' . esc_html($meta->pickup_label) . '</td></tr>';
        }

        if($meta && $meta->tracking_id){
            $trackingurl = esc_url($wc_order->get_meta('Bpost_trackingurl', true));
            $tracking_link = $trackingurl ? '<a href="' . esc_url($trackingurl) . '" target="_blank">' : '';
            $tracking_close_link = $trackingurl ? '</a>' : '';

//            echo wp_kses('<tr><td>' . esc_html( "Tracking" ) . '</td><td>' . ($trackingurl ? "<a href='$trackingurl' target='_blank'>" : "") . esc_html($meta->tracking_id) . ($trackingurl ? '</a>' : '') . '</td></tr>'),'post');
            echo wp_kses(
                '<tr><td>' . esc_html( "Tracking" ) . '</td><td>' . $tracking_link . esc_html($meta->tracking_id) . $tracking_close_link . '</td></tr>',
                array(
                    'tr' => array(),
                    'td' => array(),
                    'a'  => array(
                        'href'   => array(),
                        'target' => array(),
                    ),
                )
            );
        }
    }

    /**
     * Get an API instance.
     *
     * @param bool $force_refresh
     * @return BpostApiV3
     */
    public static function get_api($force_refresh = false) {
        if( self::$api != null && !$force_refresh) {
            return self::$api;
        }

        $app_key = self::$is_dev ? BPOST_DEV_APP_KEY : BPOST_APP_KEY;

//        if ( Bpost_is_marketplace() ) {
//            $app_key =  BpostMarketplace::instance()->get_app_key();
//
//            if( !current_user_can('administrator') ){
//                self::$api = BpostMarketplace::instance()->get_api();
//                return self::$api;
//            }
//        }

        self::$api = BpostApiV3::instance(
            sanitize_text_field(get_option(self::$OPTION_BPOST_PUBLIC_KEY)),
            sanitize_text_field(get_option(self::$OPTION_BPOST_PRIVATE_KEY)),
            $app_key,
            sanitize_text_field(get_option('Bpost_test')),
            sanitize_text_field(get_option('Bpost_token')),
            sanitize_text_field(get_option('Bpost_token_expires'))
        );

        return self::$api;
    }

    /**
     * Get the callback URL used by the API to push updates to the plugin.
     *
     * @return string
     */
    public static function get_callback_url() {
        $forceapi = sanitize_text_field(get_option(self::$OPTION_BPOST_USEWPAPI));
        $callback_url = esc_url(get_option('Bpost_callbackurl'));

        if( ( stripos($callback_url,'wp-json') > 0 ) && $forceapi ) {
            BpostWoo::log("Callbackurl stored callback $callback_url");
            return $callback_url;
        }

        $homeurl = esc_url(get_home_url());
        $homeurl = rtrim($homeurl, '/');

        $defaultapi = BpostWoo::is_api_active() && (get_option(self::$OPTION_BPOST_USEWPAPI) == '') && !get_option(self::$OPTION_BPOST_TOKEN);

        if ( $defaultapi || $forceapi) {
            $callbackurl = $homeurl . '/wp-json/Bpost/v1/update';
        } else {
            $callbackurl = $homeurl . '/Bpost-callback';
        }

        BpostWoo::log("Callbackurl $callbackurl defaultapi [$defaultapi]");
        update_option('Bpost_callbackurl', $callbackurl);

        return $callbackurl;
    }

    /**
     * Refresh the list of carriers.
     *
     * @return mixed|null
     */
    protected static function refresh_carriers() {
        if ( self::$api->get_token_string() && self::$api->is_token_valid()  ) {
            $response  = self::$api->get_carriers();

            $carriers = !isset($response->Error) ? $response : null;
            update_option('Bpost_carriers', wp_json_encode($carriers));

            $serviceLevelIds = array();
            if($carriers){
                foreach ( $carriers as $c ){
                    if( isset($c->OptionList)){
                        foreach($c->OptionList as $option){
                            if($option->Type == 1){
                                $serviceLevelIds[$c->Id] = sanitize_text_field($option->Id);
                            }
                        }
                    }
                }
            }

            update_option('Bpost_servicelevelids', $serviceLevelIds);

            if(class_exists('BpostShipping')){
                self::log("clear_carrier_classes");
                BpostShipping::clear_carrier_classes();
            }
            else {
                $message  = "Class BpostShipping not found; can't update the carrier classes. File should be at " . BPOST_PLUGIN_PATH . 'includes/admin/class-Bpost-shipping.php. Does the file exist? ' . (file_exists(BPOST_PLUGIN_PATH . 'includes/admin/class-Bpost-shipping.php') ? 'Yes': 'No');
                self::log($message);
            }

            return $carriers;
        }

        return null;
    }

    /**
     * Get pickup locations based on the address and shipping method ID.
     *
     * @param mixed $address
     * @param int $shipping_method_id
     * @return mixed
     */
    public static function get_pickup_locations($address, $shipping_method_id){
        $api = self::get_api();
        $pickup_points  = $api->get_pickup_locations( $address, $shipping_method_id);

        if( isset($pickup_points->Error) && $pickup_points->Error->Id == 401 ){
            BpostWoo::refresh_token();
            $pickup_points  = $api->get_pickup_locations( $address, $shipping_method_id);
        }

        return $pickup_points;
    }

    /**
     * Refresh the API token and carriers list.
     *
     * @return string|null
     */
    public static function refresh_token(){
        global $woocommerce;

        self::log("Refresh Token");

        self::get_api();

        $tokenresp =  self::$api->get_token(self::get_callback_url(), sanitize_text_field($woocommerce->version), BpostWoo::$version);
        $token = '';
        $tokenexpires = '';

        if( isset($tokenresp->Key) ) {
            $token = sanitize_text_field($tokenresp->Key);
            $tokenexpires = sanitize_text_field($tokenresp->Expire);

            if ( get_option( self::$OPTION_BPOST_CACHE_KEY ) != self::$api->get_public_key() ) {
                update_option( self::$OPTION_BPOST_CACHE_KEY, self::$api->get_public_key() );
            }

            self::refresh_carriers();
        }

        BpostWoo::log("Refresh Token with token=$token, token_expires=$tokenexpires");
        update_option(  self::$OPTION_BPOST_TOKEN,$token );
        update_option(  self::$OPTION_BPOST_TOKEN_EXPIRES, $tokenexpires );

        return $token;
    }

    /**
     * Execute SQL query with optional parameters.
     *
     * @param string $sql
     * @param array $params
     * @return mixed
     */
    public function executeSQL( $sql, $params = [] ) {
        global $wpdb;

        if (!empty($params)) {
            // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
            $prepared_sql = $wpdb->prepare($sql, $params);
        } else {
            $prepared_sql = $sql;
        }

        self::log($prepared_sql);
        // phpcs:ignore
        return $wpdb->query($prepared_sql);
    }

    /**
     * Execute SQL SELECT query with optional parameters.
     *
     * @param string $sql
     * @param array $params
     * @return mixed
     */
    public function sqlSelect( $sql, $params = [] ) {
        global $wpdb;

        if (!empty($params)) {
            // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
            $prepared_sql = $wpdb->prepare($sql, $params);
        } else {
            $prepared_sql = $sql;
        }

        self::log($prepared_sql);
        // phpcs:ignore
        return $wpdb->get_results($prepared_sql);
    }

    /**
     * Log messages to the error log or a specified file.
     *
     * @param string $msg
     * @param bool $force
     * @return void
     */
    public static function log($msg, $force = false) {
        error_log("\n" . gmdate("Y-m-d H:i:s") . "\t" . esc_html($msg));
    }

    /**
     * Get the current language code in ISO2 format.
     *
     * @return string
     */
    public function get_lang(){
        return $this->get_ISO2_from_localisation(get_locale());
    }

    /**
     * Translate a string using the Bpost translation method.
     *
     * @param string $origin
     * @return string
     */
    public function translate($origin){
        return $this->__($origin);
    }

    /***
     * Try to determine programatically if the API is active
     */
    public static function is_api_active() {
        set_error_handler(function() { /* ignore errors */ });

        $checkapiurl = get_home_url() . '/wp-json';
        $contentvalid = true;

        try {
            $response = wp_remote_get($checkapiurl);

            if (is_wp_error($response)) {
                // Handle error here, e.g., log or show an error message
                $error_message = $response->get_error_message();
                // You could log the error or take appropriate action
            } else {
                $content = wp_remote_retrieve_body($response);
                // Process the $content as needed
            }

            $json = json_decode($content);
            $contentvalid = isset($json->name);
        }
        catch (Exception $e) {
            $contentvalid = false;
            self::log("Exception ocurred trying to get the api url " . $e->getMessage());
        }

        restore_error_handler();
        self::log("==== is_api_active " . ($contentvalid ? 'Yes' : 'No'));
        return $contentvalid;
    }

    /**
     * Check for necessary upgrades and perform them.
     *
     * @return void
     */
    static function Bpost_check_upgrade() {
        global $wpdb;

        $current_version = get_option('Bpost_app_version', '0');

        // Use version_compare for proper semantic version comparison
        if(version_compare($current_version, BPOST_VERSION, '>=')) {
            return;
        }

        BpostWoo::log("Bpost Upgrade from $current_version", true);

        // phpcs:ignore
        $ordercolumns = $wpdb->get_results($wpdb->prepare("SHOW COLUMNS FROM {$wpdb->prefix}Bpost WHERE field = %s", 'labelurl'));

        if(!isset($ordercolumns[0]->Field)) {
            BpostWoo::log("Updating Bpost datamodel to include label creation");


            $wpdb->query("ALTER TABLE {$wpdb->prefix}Bpost ADD COLUMN labelurl VARCHAR(255) NULL"); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.SchemaChange
        }

        if (!get_option(BpostWoo::$OPTION_BPOST_CACHE_KEY) && get_option(BpostWoo::$OPTION_BPOST_PUBLIC_KEY)) {
            update_option(BpostWoo::$OPTION_BPOST_CACHE_KEY, sanitize_text_field(get_option(BpostWoo::$OPTION_BPOST_PUBLIC_KEY)));
            update_option(BpostWoo::$OPTION_CALLBACK_URL, esc_url(BpostWoo::get_callback_url()));
        }

        update_option('Bpost_app_version', BPOST_VERSION);
    }

    /**
     * Initialize HS Code product attribute
     * This creates a custom product attribute for HS codes if it doesn't exist
     */
    public function init_hs_code_attribute() {
        // Check if WooCommerce is loaded and functions are available
        if (!function_exists('wc_get_attribute_taxonomies') || !function_exists('wc_create_attribute')) {
            return;
        }
        
        // Check if HS Code attribute already exists
        $attribute_name = 'hs_code';
        $attribute_label = 'HS Code';
        
        // Get all attribute taxonomies
        $attribute_taxonomies = wc_get_attribute_taxonomies();
        $attribute_exists = false;
        
        if ($attribute_taxonomies) {
            foreach ($attribute_taxonomies as $taxonomy) {
                if ($taxonomy->attribute_name === $attribute_name) {
                    $attribute_exists = true;
                    break;
                }
            }
        }
        
        if (!$attribute_exists) {
            // Create the attribute
            $attribute_data = array(
                'attribute_label'   => $attribute_label,
                'attribute_name'    => $attribute_name,
                'attribute_type'    => 'text',
                'attribute_orderby' => 'menu_order',
                'attribute_public'  => 0, // Not visible on product pages by default
            );
            
            $attribute_id = wc_create_attribute($attribute_data);
            
            if (is_wp_error($attribute_id)) {
                BpostWoo::log("Failed to create HS Code product attribute: " . $attribute_id->get_error_message());
            } else {
                BpostWoo::log("HS Code product attribute created successfully with ID: " . $attribute_id);
            }
        }
    }

    /**
     * Get HS Code for a specific product
     * 
     * @param int|WC_Product $product Product ID or WC_Product object
     * @return string|null HS Code or null if not found
     */
    public function get_product_hs_code($product) {
        if (is_numeric($product)) {
            $product = wc_get_product($product);
        }
        
        if (!$product) {
            return null;
        }
        
        // Method 1: Check for HS Code attribute
        $hs_code = $this->get_hs_code_from_attribute($product);
        if ($hs_code) {
            return $hs_code;
        }
        
        // Method 2: Check for custom meta field
        $hs_code = $product->get_meta('_hs_code');
        if ($hs_code) {
            return $hs_code;
        }
        
        // Method 3: Check for legacy meta field
        $hs_code = $product->get_meta('hs_code');
        if ($hs_code) {
            return $hs_code;
        }
        
        return null;
    }

    /**
     * Get HS Code from product attribute
     * 
     * @param WC_Product $product
     * @return string|null
     */
    private function get_hs_code_from_attribute($product) {
        $attributes = $product->get_attributes();
        
        foreach ($attributes as $attribute) {
            if ($attribute->get_name() === 'pa_hs_code') {
                $terms = $attribute->get_options();
                if (!empty($terms)) {
                    // For text attributes, the first option contains the value
                    return is_array($terms) ? $terms[0] : $terms;
                }
            }
        }
        
        return null;
    }

    /**
     * Set HS Code for a product
     * 
     * @param int|WC_Product $product Product ID or WC_Product object
     * @param string $hs_code HS Code value
     * @param string $method 'attribute' or 'meta' - how to store the HS code
     * @return bool Success status
     */
    public function set_product_hs_code($product, $hs_code, $method = 'attribute') {
        if (is_numeric($product)) {
            $product = wc_get_product($product);
        }
        
        if (!$product) {
            return false;
        }
        
        if ($method === 'attribute') {
            return $this->set_hs_code_as_attribute($product, $hs_code);
        } else {
            return $this->set_hs_code_as_meta($product, $hs_code);
        }
    }

    /**
     * Set HS Code as product attribute
     * 
     * @param WC_Product $product
     * @param string $hs_code
     * @return bool
     */
    private function set_hs_code_as_attribute($product, $hs_code) {
        // Ensure the attribute exists
        $this->init_hs_code_attribute();
        
        // Get current attributes
        $attributes = $product->get_attributes();
        
        // Create or update HS Code attribute
        $hs_attribute = new WC_Product_Attribute();
        $hs_attribute->set_name('pa_hs_code');
        $hs_attribute->set_options(array($hs_code));
        $hs_attribute->set_position(0);
        $hs_attribute->set_visible(false);
        $hs_attribute->set_variation(false);
        
        $attributes['pa_hs_code'] = $hs_attribute;
        
        $product->set_attributes($attributes);
        $product->save();
        
        return true;
    }

    /**
     * Set HS Code as product meta
     * 
     * @param WC_Product $product
     * @param string $hs_code
     * @return bool
     */
    private function set_hs_code_as_meta($product, $hs_code) {
        $product->update_meta_data('_hs_code', sanitize_text_field($hs_code));
        $product->save();
        
        return true;
    }

    /**
     * Get HS Code for all products in cart
     * 
     * @return array Array of HS codes indexed by product ID
     */
    public function get_cart_hs_codes() {
        $hs_codes = array();
        
        if (!WC()->cart) {
            return $hs_codes;
        }
        
        foreach (WC()->cart->get_cart() as $cart_item_key => $cart_item) {
            $product_id = $cart_item['product_id'];
            $hs_code = $this->get_product_hs_code($product_id);
            
            if ($hs_code) {
                $hs_codes[$product_id] = $hs_code;
            }
        }
        
        return $hs_codes;
    }

    /**
     * Add HS Code field to product admin
     */
    public function add_hs_code_admin_field() {
        global $post;
        
        echo '<div class="options_group">';
        
        woocommerce_wp_text_input(
            array(
                'id'          => '_hs_code',
                'label'       => __('HS Code', 'bpost-shipping-platform'),
                'placeholder' => __('e.g., 85171200', 'bpost-shipping-platform'),
                'desc_tip'    => true,
                'description' => __('Harmonized System code for customs declarations', 'bpost-shipping-platform'),
            )
        );
        
        echo '</div>';
    }

    /**
     * Save HS Code from product admin
     */
    public function save_hs_code_admin_field($post_id) {
        if (isset($_POST['_hs_code'])) {
            $hs_code = sanitize_text_field($_POST['_hs_code']);
            update_post_meta($post_id, '_hs_code', $hs_code);
        }
    }

    /**
     * Get Country of Origin for a specific product
     *
     * @param int|WC_Product $product Product ID or WC_Product object
     * @return string|null Country of Origin or null if not found
     */
    public function get_product_country_of_origin($product) {
        if (is_numeric($product)) {
            $product = wc_get_product($product);
        }

        if (!$product) {
            return null;
        }

        // Check for custom meta field
        $country_of_origin = $product->get_meta('_country_of_origin');
        if ($country_of_origin) {
            return $country_of_origin;
        }

        // Check for legacy meta field
        $country_of_origin = $product->get_meta('country_of_origin');
        if ($country_of_origin) {
            return $country_of_origin;
        }

        return null;
    }

    /**
     * Set Country of Origin for a product
     *
     * @param int|WC_Product $product Product ID or WC_Product object
     * @param string $country_of_origin Country of Origin value
     * @return bool Success status
     */
    public function set_product_country_of_origin($product, $country_of_origin) {
        if (is_numeric($product)) {
            $product = wc_get_product($product);
        }

        if (!$product) {
            return false;
        }

        $product->update_meta_data('_country_of_origin', sanitize_text_field($country_of_origin));
        $product->save();

        return true;
    }

    /**
     * Add Country of Origin field to product admin
     */
    public function add_country_of_origin_admin_field() {
        global $post;

        echo '<div class="options_group">';

        woocommerce_wp_text_input(
            array(
                'id'          => '_country_of_origin',
                'label'       => __('Country of Origin', 'bpost-shipping-platform'),
                'placeholder' => __('e.g., BE', 'bpost-shipping-platform'),
                'desc_tip'    => true,
                'description' => __('Country of Origin (2-letter country code) for customs declarations', 'bpost-shipping-platform'),
            )
        );

        echo '</div>';
    }

    /**
     * Save Country of Origin from product admin
     */
    public function save_country_of_origin_admin_field($post_id) {
        if (isset($_POST['_country_of_origin'])) {
            $country_of_origin = sanitize_text_field($_POST['_country_of_origin']);
            update_post_meta($post_id, '_country_of_origin', $country_of_origin);
        }
    }
}

