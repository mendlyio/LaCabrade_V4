<?php
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * Handle the shipping options
 * Add carriers as shipping methods, generate the necessary classes to declare them on woocommerce
 *
 * Furthermore, woo replaces the checkout html so to grant people will see the button when it's available
 * for the selected shipping method we must devide this in to 2 parts :
 * 1. declare an html element in the checkout summary table
 * 2. on update order review fragments send the button if available
 */
class BpostShipping {

    private static $_instance = null;

    /**
     * @var bool wbs_active
     */
    private $wbs_active = false;

    /** Did we init shipping ? **/
    private $started = 0;

    public $is_dev;

//    public $HasPickup;

    private function __construct(){
        $this->actions();
        $this->filters();

        $this->is_dev = defined('BPOST_DEV');
    }

    public static function get_instance() {
        if ( is_null( self::$_instance ) ) {
            self::$_instance = new self();
        }

        return self::$_instance;
    }

    public function actions() {
        add_action( 'woocommerce_shipping_init', array( $this, 'Bpost_init_shipping' ) );
        add_filter('woocommerce_get_sections_shipping', array( $this, 'add_shipping_settings_section_tab') );

        add_action( 'wp_footer', array( $this, 'script_carriers_with_pickup' ) );
        add_action( 'wp_ajax_nopriv_Bpost_pickup_locations', array( $this, 'ajax_get_pickup_locations' ) );
        add_action( 'wp_ajax_Bpost_pickup_locations', array( $this, 'ajax_get_pickup_locations' ) );
        add_action( 'wp_ajax_nopriv_Bpost_selected_carrier', array( $this, 'ajax_get_selected_carrier' ) );
        add_action( 'wp_ajax_Bpost_selected_carrier', array( $this, 'ajax_get_selected_carrier' ) );

        add_action( 'wp_ajax_nopriv_Bpost_selected_carrier_react', array( $this, 'ajax_get_selected_carrier_react' ) );
        add_action( 'wp_ajax_Bpost_selected_carrier_react', array( $this, 'ajax_get_selected_carrier_react' ) );

        add_action( 'wp_ajax_nopriv_Bpost_set_pickup_point', array( $this, 'ajax_set_pickup_point' ) );
        add_action( 'wp_ajax_Bpost_set_pickup_point', array( $this, 'ajax_set_pickup_point' ) );
        
        add_action( 'wp_ajax_nopriv_Bpost_clear_pickup_session_data', array( $this, 'ajax_clear_pickup_session_data' ) );
        add_action( 'wp_ajax_Bpost_clear_pickup_session_data', array( $this, 'ajax_clear_pickup_session_data' ) );

        // Get checkout address data independently of theme
        add_action( 'wp_ajax_nopriv_Bpost_get_checkout_address', array( $this, 'ajax_get_checkout_address' ) );
        add_action( 'wp_ajax_Bpost_get_checkout_address', array( $this, 'ajax_get_checkout_address' ) );

        /** save wbs instance properties **/
        add_action('wp_ajax_Bpost_wbs_settings', array( $this, 'ajax_wbs_settings') );
        add_action( 'woocommerce_checkout_update_order_meta' , array( $this, 'Bpost_order_submited') );
        add_action('woocommerce_store_api_checkout_order_processed',array( $this, 'Bpost_block_order_submited'));

        // declare the pickup point
        add_action( 'woocommerce_checkout_fields', array( $this, 'checkout_fields'),10, 2);

        // display the pickup point in the order details
        add_action( 'woocommerce_admin_order_data_after_shipping_address', array( $this, 'checkout_pickup_field_display_admin_order_meta') );

        // Validate the pickup points
        add_action( 'woocommerce_after_checkout_validation', array( $this, 'checkout_validation'), 10, 2 );

        add_action( 'wp', array($this,'checkout_init') );

    }
# First, get a session cookie by logging into WooCommerce
# Then use that cookie in the request:

    public function add_shipping_settings_section_tab( $section ) {
        // Get instance IDs
        $ids = get_option('Bpost_instanceIds');


        // Check if we are on the desired admin page
        if (isset($_GET['page']) && $_GET['page'] === 'wc-settings') {
            // Enqueue the script
            wp_enqueue_script('bpost_shipping_script', '/wp-content/plugins/bpost-shipping-platform/assets/js/bpost-shipping.js', array('jquery'), '1.0.0', true);

            // Localize script to pass PHP variables to JavaScript
            wp_localize_script('bpost_shipping_script', 'bpostData', array(
                'instanceIds' => $ids,
                'ajaxUrl' => admin_url('admin-ajax.php'),
            ));
        }

        return $section;
    }


    public function checkout_init()
    {
        global $wp;
        if ($wp->request == 'checkout' || $wp->request == '137-2'){

            WC()->session->__unset('shipping_pickup_id' );
            WC()->session->__unset('Bpostpickuplabel' );
            WC()->session->__unset('Bpostpickupextended' );
            WC()->session->__unset('shipping_carrier_id' );
        }
    }

    public function ajax_set_pickup_point() {
        WC()->session->set('shipping_pickup_id', isset($_GET['shipping_pickup_id']) ? sanitize_text_field(wp_unslash($_GET['shipping_pickup_id'])) : '');
        
        // Only store carrier_id if it's a valid non-zero value
        $carrier_id = isset($_GET['shipping_carrier_id']) ? absint($_GET['shipping_carrier_id']) : 0;
        if ($carrier_id) {
            WC()->session->set('shipping_carrier_id', $carrier_id);
        }
        
        WC()->session->set('shipping_method', WC()->session->get('chosen_shipping_methods'));
        WC()->session->set('shipping_pickup_label', isset($_GET['shipping_pickup_label']) ? sanitize_text_field(wp_unslash($_GET['shipping_pickup_label'])) : '');
        WC()->session->set('Bpost_pickup_extended', isset($_GET['Bpost_pickup_extended']) ? sanitize_text_field(wp_unslash($_GET['Bpost_pickup_extended'])) : '');

        wp_send_json_success(['status' => 'Success', 'code' => 200]);
    }

    public function ajax_clear_pickup_session_data() {
        WC()->session->__unset('shipping_pickup_id');
        WC()->session->__unset('Bpostpickuplabel');
        WC()->session->__unset('Bpostpickupextended');
        WC()->session->__unset('shipping_carrier_id');

        wp_send_json_success(['status' => 'Success', 'message' => 'Pickup session data cleared', 'code' => 200]);
    }

    /**
     * Get checkout address data independently of theme
     * Returns shipping and billing address data with country validation
     */
    public function ajax_get_checkout_address() {
        try {
            // Check if WooCommerce is available
            if (!function_exists('WC') || !WC()->customer) {
                wp_send_json_error(['error' => 'WooCommerce not available', 'code' => 500]);
                return;
            }

            $customer = WC()->customer;
            
            // Get shipping address data
            $shipping_address = [
                'country' => $customer->get_shipping_country(),
                'state' => $customer->get_shipping_state(),
                'city' => $customer->get_shipping_city(),
                'postcode' => $customer->get_shipping_postcode(),
                'address_1' => $customer->get_shipping_address_1(),
                'address_2' => $customer->get_shipping_address_2(),
                'first_name' => $customer->get_shipping_first_name(),
                'last_name' => $customer->get_shipping_last_name(),
                'company' => $customer->get_shipping_company()
            ];

            // Get billing address data
            $billing_address = [
                'country' => $customer->get_billing_country(),
                'state' => $customer->get_billing_state(),
                'city' => $customer->get_billing_city(),
                'postcode' => $customer->get_billing_postcode(),
                'address_1' => $customer->get_billing_address_1(),
                'address_2' => $customer->get_billing_address_2(),
                'first_name' => $customer->get_billing_first_name(),
                'last_name' => $customer->get_billing_last_name(),
                'company' => $customer->get_billing_company(),
                'email' => $customer->get_billing_email(),
                'phone' => $customer->get_billing_phone()
            ];

            // Apply country validation logic
            $validated_country = '';
            if (!empty($shipping_address['country'])) {
                $validated_country = $shipping_address['country'];
            } elseif (!empty($billing_address['country'])) {
                $validated_country = $billing_address['country'];
            }

            // Get country name if we have a code
            $country_name = '';
            if (!empty($validated_country) && function_exists('WC')) {
                $countries = WC()->countries->get_countries();
                $country_name = isset($countries[$validated_country]) ? $countries[$validated_country] : '';
            }

            $response = [
                'shipping_address' => $shipping_address,
                'billing_address' => $billing_address,
                'validated_country' => [
                    'code' => $validated_country,
                    'name' => $country_name
                ],
                'timestamp' => current_time('timestamp')
            ];

            wp_send_json_success($response);

        } catch (Exception $e) {
            wp_send_json_error(['error' => $e->getMessage(), 'code' => 500]);
        }
    }


    public function Bpost_block_order_submited($order)
    {
        global $wpdb;
        $shipping_pickup_id = WC()->session->get('shipping_pickup_id' );
        $pickup_label = WC()->session->get('shipping_pickup_label' );
        $pickup_extended = WC()->session->get('Bpost_pickup_extended' );
        $carrier_id = WC()->session->get('shipping_carrier_id' );

        // If carrier_id not in session, extract from order's shipping method
        if (!$carrier_id) {
            $shipping_items = $order->get_items('shipping');
            foreach ($shipping_items as $item) {
                $method_id = $item->get_method_id();
                // Extract number from "shipping_Bpost_68" format
                if (preg_match('/shipping_Bpost_(\d+)/', $method_id, $matches)) {
                    $carrier_id = absint($matches[1]);
                    break;
                }
            }
        }

        error_log("Carrier id is: " . $carrier_id);


        #
        # Append this info into the post meta so it can be picked up more easily by third party plugins
        ##Reseno

        if ( !is_null( $shipping_pickup_id) && !is_null( $pickup_label)) {
            // returns WC_Order object.


            $order->update_meta_data('Bpostpickup', sanitize_text_field( $shipping_pickup_id ));
            $order->update_meta_data('Bpostpickuplabel', sanitize_text_field( $pickup_label ) );

            if (!is_null($pickup_extended)){
                $order->update_meta_data('Bpostpickupextended', sanitize_text_field( $pickup_extended ));
            }


            $order->save();
        }

        // Validate carrier_id before storing - don't store if it's 0 or null
        if (!$carrier_id) {
            error_log("Bpost ERROR: Cannot store block order " . $order->get_id() . " - carrier_id is missing or invalid: " . 
                     ($carrier_id ? $carrier_id : 'not set'));
            return false;
        }

        $sql = sprintf( "insert into %sBpost (`id`, `status`, `pickup_id`, `carrier_id`, `pickup_label`,`pickup_extended`) VALUES(%d, %d,\"%s\", %d,\"%s\",\"%s\") ",
            $wpdb->prefix,
            $order->get_id(),
            BpostOrder::$STATUS_NOT_EXPORTED,
            $shipping_pickup_id,
            $carrier_id,
            $pickup_label,
            $pickup_extended
        );

        $wpdb->query( $sql );

        WC()->session->__unset('shipping_pickup_id' );
        WC()->session->__unset('shipping_pickup_label' );
        WC()->session->__unset('Bpost_pickup_extended' );
        WC()->session->__unset('shipping_carrier_id' );

    }

    public function ajax_get_selected_carrier_react($carrierId)

    {

        if (WC()->session->get('shipping_pickup_id') !== null) {
            WC()->session->__unset('shipping_pickup_id');
        }
        if (WC()->session->get('shipping_pickup_label') !== null) {
            WC()->session->__unset('shipping_pickup_label');
        }
        if (WC()->session->get('Bpost_pickup_extended') !== null) {
            WC()->session->__unset('Bpost_pickup_extended');
        }

        if (WC()->session->get('shipping_carrier_id') !== null) {
            WC()->session->__unset('shipping_carrier_id');
        }

        //Unset previous Bpost_selected_carrier
        if (WC()->session->get('Bpost_selected_carrier') !== null) {
            WC()->session->__unset('Bpost_selected_carrier');
        }
        if (!$carrierId) {

            echo json_encode(0);

            die();

        }

        // Construct option name from carrier ID (e.g., shipping_Bpost_30:7 -> woocommerce_shipping_Bpost_30_7_settings)

        $carrier_id_formatted = str_replace(':', '_', $carrierId);

        $option_name = 'woocommerce_' . $carrier_id_formatted . '_settings';

        $settings = get_option($option_name);


        if (!$settings) {

            echo json_encode(0);

            die();

        }
        

        // Extract carrier ID number for response

        preg_match('/\d+/', $carrierId, $matches);

        $carrier_id_number = $matches[0] ?? null;

        WC()->session->set('Bpost_selected_carrier', $carrier_id_number);

        

        if (!$carrier_id_number) {

            return 0;

        }

        

        // Get carrier object and check if pickup is available

        $carrier = $this->get_Bpost_carrier($carrierId);

        $hasPickup = self::is_carrier_pickup_able($carrier);

        



        if (!$hasPickup) {

            return 0;

        }

        

        // Build response based on settings

        $response = ['status' => 1, 'carrier_id' => $carrier_id_number];

        

        // Check pickup behavior from settings - prioritize service_level for bpost

        // For bpost - only show pickup for specific service levels, and make it mandatory
        if (isset($settings['service_level'])) {
            $mandatory_service_levels = [301, 307, 'BPSML02', 'BPSML04'];
            
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

    public function ajax_get_selected_carrier()
    {
        if (WC()->session->get('shipping_pickup_id') !== null) {
            WC()->session->__unset('shipping_pickup_id');
        }
        if (WC()->session->get('shipping_pickup_label') !== null) {
            WC()->session->__unset('shipping_pickup_label');
        }
        if (WC()->session->get('Bpost_pickup_extended') !== null) {
            WC()->session->__unset('Bpost_pickup_extended');
        }

        if (WC()->session->get('shipping_carrier_id') !== null) {
            WC()->session->__unset('shipping_carrier_id');
        }

        //Unset previous Bpost_selected_carrier
        if (WC()->session->get('Bpost_selected_carrier') !== null) {
            WC()->session->__unset('Bpost_selected_carrier');
        }
        
        $frontendCarrier = isset($_GET['carrier']) ? sanitize_text_field(wp_unslash($_GET['carrier'])) : '';

//        if (!$frontendCarrier){
//            return ;
//        }

        $zones = WC_Shipping_Zones::get_zones();

        if ( ! is_array( $zones ) ) {
            return array();
        }

        $shipping_methods = array_column( $zones, 'shipping_methods' );

        $flatten = array_merge( ...$shipping_methods );


        foreach ( $flatten as $value ) {
            if ($value->title == $frontendCarrier){
                $flatRateOption = [
                    'optionId' => $value->id,
                    'pickupbehaviour' => $value->pickupbehaviour,
                    'service_level' => $value->service_level
                ];

            }
            foreach ($value->settings['rules'] as $rule){
                if ($rule['meta']['title'] == $frontendCarrier){
               
                    $weightOption = [
                        'optionId'=> $value->id,
                        'instanceId' => $value->instance_id,
                    ];
                }
            }

        }


        $weightPudoOptions = get_option('wbs_'.$weightOption['instanceId'].'_Bpost');

        // Use a regular expression to find the number
        preg_match('/\d+/', $weightOption['optionId'], $matches);

        // Extract the first match
        $number = $matches[0];

        if ($weightPudoOptions['service_level'] == 301 || $weightPudoOptions['service_level'] == 307 || $weightPudoOptions['service_level'] == 'BPSML02' || $weightPudoOptions['service_level'] == 'BPSML04'){
            WC()->session->set('Bpost_selected_carrier', $number);
           
            echo wp_json_encode(['status' => 1,'carrier_id' => $number,'pickupMandatory' => true]);die();
        }

        if( isset($flatRateOption['optionId']) ) {

            $carrier = $this->get_Bpost_carrier($flatRateOption['optionId']);

            $HasPickup = self::is_carrier_pickup_able($carrier);


            if($carrier && $HasPickup) {
                WC()->session->set('Bpost_selected_carrier', $carrier->Id);
                
                if($flatRateOption['pickupbehaviour'] != BpostOrder::$PICKUP_BEHAVIOUR_IMPOSSIBLE && ($flatRateOption['service_level'] == 301 || $flatRateOption['service_level'] == 307 || $flatRateOption['service_level'] == 'BPSML02' || $flatRateOption['service_level'] == 'BPSML04')) {
                    echo wp_json_encode(['status' => 1,'carrier_id' => $carrier->Id,'pickupMandatory' => true]);die();
                }
                else{
                    echo wp_json_encode(0);die();
                }
            }
        }
        echo wp_json_encode(0);die();
    }


    /**
     * This function will be called from ajax
     * http://{domain}/?wc-ajax=checkout
     */
    public function Bpost_order_submited ( $order_id ) {
        global $wpdb;

        require_once BPOST_PLUGIN_PATH.'/includes/core/class-Bpost-order.php';

        $selected_pickup = isset($_POST['shipping_pickup_id']) ? sanitize_text_field(wp_unslash($_POST['shipping_pickup_id'])) : '';
        $carrier_id = isset($_POST['shipping_carrier_id']) ? absint($_POST['shipping_carrier_id']) : 0;
        // Get and sanitize shipping method array
        $raw_shipping_method = isset($_POST['shipping_method']) ? (array)$_POST['shipping_method'] : array();
        $shipping_method = array_map('sanitize_text_field', array_map('wp_unslash', $raw_shipping_method));
        $pickup_label = isset($_POST['shipping_pickup_label']) ? sanitize_text_field(wp_unslash($_POST['shipping_pickup_label'])) : '';
        $pickup_extended = isset($_POST['Bpost_pickup_extended']) ? sanitize_text_field(wp_unslash($_POST['Bpost_pickup_extended'])) : '';

          // Also check session data as fallback

          $session_pickup_id = WC()->session->get('shipping_pickup_id');

  
          $session_carrier_id = WC()->session->get('shipping_carrier_id');
      
  
        #
        # Append this info into the post meta so it can be picked up more easily by third party plugins
        ##Reseno

        if ( ! empty( $_POST['Bpostpickup'] ) ) {
            $order = wc_get_order( $order_id ); // returns WC_Order object.

            $order->update_meta_data('Bpostpickup', sanitize_text_field( $_POST['Bpostpickup'] ));
            $order->update_meta_data('Bpostpickuplabel', sanitize_text_field( $pickup_label ) );
            $order->update_meta_data('Bpostpickupextended', sanitize_text_field( $pickup_extended ));

            $order->save();
        }

        if( !is_numeric( $carrier_id ) && isset($shipping_method[0]) && ( $carrier = $this->get_Bpost_carrier($shipping_method[0], $order_id) ) ){

            $carrier_id = $carrier->Id;
        }

        if (!$selected_pickup && $session_pickup_id) {

            $selected_pickup = $session_pickup_id;

            error_log("Bpost DEBUG: Using session pickup_id as fallback");

        }


        if (!$carrier_id && $session_carrier_id) {

            $carrier_id = $session_carrier_id;

            error_log("Bpost DEBUG: Using session carrier_id as fallback");

        }

        // Validate carrier_id before storing - don't store if it's 0
        if (!$carrier_id) {
            error_log("Bpost ERROR: Cannot store order - carrier_id is missing or invalid. POST carrier_id: " . 
                     (isset($_POST['shipping_carrier_id']) ? $_POST['shipping_carrier_id'] : 'not set') . 
                     ", Session carrier_id: " . ($session_carrier_id ? $session_carrier_id : 'not set'));
            return false;
        }


        $sql = sprintf( "insert into %sBpost (`id`, `status`, `pickup_id`, `carrier_id`, `pickup_label`,`pickup_extended`) VALUES(%d, %d,\"%s\", %d,\"%s\",\"%s\") ",
            $wpdb->prefix,
            $order_id,
            BpostOrder::$STATUS_NOT_EXPORTED,
            $selected_pickup,
            $carrier_id,
            $pickup_label,
            $pickup_extended
        );

        $wpdb->query( $sql );
    }

    /**
     * Get shipping address from session, use it to get the pickup locations to display on the map
     * https://docs.woocommerce.com/wc-apidocs/source-class-WC_Cart_Session.html#167-181
     */
    public function ajax_get_pickup_locations() {
        $client_id = $this->get_client_identifier();


        // Start timing
        $start_time = microtime(true);

        // Sanitize and validate inputs
        $raw_address = isset($_GET['Address']) ? (array)$_GET['Address'] : array();
        $address = array_map('sanitize_text_field', array_map('wp_unslash', $raw_address));
        $shipping_method_id = isset($_GET['CarrierId']) ? absint($_GET['CarrierId']) : 0;


        if (empty($address)) {
            wp_send_json_error(['Error' => 'Address is required', 'Id' => -1]);
            return;
        }

        if (!is_numeric($shipping_method_id)) {
            // There's only one plugin that uses generic rates to which we associate our carriers
            $carrier = $this->get_Bpost_carrier_from_table_rates($shipping_method_id);
            if (!$carrier) {
                wp_send_json_error(['Error' => 'This carrier is not a Bpost carrier', 'Id' => -1]);
                return;
            }

            $shipping_method_id = $carrier->Id;
        }

        WC()->session->set('Bpost_selected_carrier', $shipping_method_id);       

        $pickup_points = BpostWoo::get_pickup_locations($address, $shipping_method_id);


        if ($pickup_points) {
            if (isset($pickup_points->Error) && $pickup_points->Error->Id == 401) {
                BpostWoo::refresh_token();
                $pickup_points = BpostWoo::get_pickup_locations($address, $shipping_method_id);
            }

            $pickup_points->carrierId = $shipping_method_id;

            // Calculate execution time
            $end_time = microtime(true);
            $execution_time = ($end_time - $start_time) * 1000;

            // Add timing information to response
            $pickup_points->execution_time = round($execution_time, 2);
            $pickup_points->execution_time_unit = 'ms';
            $pickup_points->from_cache = false;

            // Cache the results for 1 hour (3600 seconds)
//            $cache_duration = 21600;

//            set_transient($cache_key, $pickup_points, $cache_duration);

            wp_send_json($pickup_points);
            return;
        }

        wp_send_json(['Error' => 'Fatal error in requesting the pickup points', 'Id' => -1]);
    }

    /**
     * Get client identifier for rate limiting
     *
     * @return string
     */
    private function get_client_identifier() {
        // Get and sanitize IP address
        $ip = '';
        if (isset($_SERVER['REMOTE_ADDR'])) {
            // Validate and sanitize IP address
            $ip = filter_var($_SERVER['REMOTE_ADDR'], FILTER_VALIDATE_IP);
            if ($ip === false) {
                $ip = ''; // Set to empty string if IP is invalid
            }
        }
        $user_id = get_current_user_id();
        return $user_id ? "user_{$user_id}" : "ip_{$ip}";
    }

    /**
     * Save wbs instance settings
     *
     */
    public function ajax_wbs_settings(){
        global $current_user;

        // Verify nonce first
        if(!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'label_print_nonce') ){
            wp_send_json_error('Invalid security token');
            die();
        }

        // Check user capabilities
        if(!in_array('administrator', $current_user->roles)){
            wp_send_json_error('The request is not sent from the admin panel or by a user with the correct role');
            die();
        }

        // Get and sanitize instance_id
        $instance_id = isset($_POST['instance_id']) ? absint($_POST['instance_id']) : 0;
        if (!$instance_id) {
            wp_send_json_error('Invalid instance ID');
            die();
        }

        // Get and sanitize data array
        $raw_data = isset($_POST['data']) ? (array)$_POST['data'] : array();
        if (!is_array($raw_data)) {
            wp_send_json_error('Invalid data format');
            die();
        }

        $settings = array();
        foreach($raw_data as $setting) {
            if (!isset($setting['name']) || !isset($setting['value'])) {
                continue;
            }

            // Sanitize setting name and value
            $setting_name = sanitize_text_field($setting['name']);
            $setting_value = sanitize_text_field($setting['value']);

            // Validate setting name (only allow alphanumeric and underscore)
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $setting_name)) {
                continue;
            }

            $settings[$setting_name] = $setting_value;
        }

        // Validate that we have settings to save
        if (empty($settings)) {
            wp_send_json_error('No valid settings to save');
            die();
        }

        $setting_name = 'wbs_' . absint($instance_id) . '_Bpost';
        update_option($setting_name, $settings);

        wp_send_json_success(array(
            'message' => 'Settings saved successfully',
            'settings' => $settings
        ));
        die();
    }

    /**
     * Register Filters :  register_shipping_methods
     */
    public function filters() {
        add_filter( 'woocommerce_shipping_methods', array($this, 'add_shipping_methods') );
        add_filter( 'woocommerce_update_order_review_fragments', array( $this, 'shipping_fragments' ) , 200 );
        add_filter( 'woocommerce_review_order_before_payment' , array( $this, 'Bpost_shipping_options') , 200 ); //avoid conflicts with other plugins trying to print stuff Woo-wallet will print twice without this
    }

    /**
     * We will call this function every time we refresh the carriers
     * Thus granting all classes are up to date, while not generating them more often than necessary
     * This is done every time the user saves the options page
     */
    public static function clear_carrier_classes() {
        global $wpdb;

        // Get the upload directory path
        $upload_dir = wp_upload_dir();
        $bpost_dir = $upload_dir['basedir'] . '/bpost-shipping';

        // Only delete files if directory exists
        if (file_exists($bpost_dir)) {
            $files = glob($bpost_dir . '/*'); // get all file names
            foreach($files as $file){
                if(is_file($file))
                    unlink($file);
            }
        }

        $wbs_active =  class_exists('\Wbs\ShippingMethod');

        //Make sure we also clean any unavailable methods from the datamodel
        $methods = $wpdb->get_results( "select * from {$wpdb->prefix}woocommerce_shipping_zone_methods " );

        foreach($methods as $method){
            if(stripos($method->method_id, 'Bpost') === false ){
                continue;
            }

            if( stripos($method->method_id,'weight') !== false && !$wbs_active){
                $wpdb->query( "delete from {$wpdb->prefix}woocommerce_shipping_zone_methods where instance_id = ".$method->instance_id);
            }
        }
    }

    /**
     * We need this method to insert the html where we will update the pickup button
     * However.. it is called from ajax also, which would duplicate our html snipet, so we must return null if it's ajax.
     */
    public function Bpost_shipping_options () {
        if ( is_ajax() ) {
            return;
        }
        echo "<table class='Bpost-shipping-options'></table>";
    }

    /**
     * We use this action to return a fragment
     * that will display the options for the selected shipping method
     */
    public function shipping_fragments( $fragments ){
        global $Bpost;
        if(get_option('Bpost_pickupdisable')){
            BpostWoo::log("pickup points are disabled");
            return $fragments;
        }

        $Bpost_options = "<table class='Bpost-shipping-options'>";
        $choosen_methods_woo = WC()->session->get( 'chosen_shipping_methods' );

        BpostWoo::log("Session " . var_export(WC()->session, true));
        BpostWoo::log("Methods " . var_export($choosen_methods_woo, true));

        if( isset($choosen_methods_woo[0]) ) {
            $carrier = $this->get_Bpost_carrier($choosen_methods_woo[0]);
            $HasPickup = self::is_carrier_pickup_able($carrier);

            // Store carrier_id in session for all Bpost carriers, not just those with pickup
            if ($carrier && $carrier->Id) {
                WC()->session->set('shipping_carrier_id', $carrier->Id);
            }

            if($carrier && $HasPickup) {
                // Display the select point button based on service level and pickup behavior
                $settings = $this->get_settings_from_shipping_method_id($choosen_methods_woo[0]);
                $showPickup = false;
                $pickupMandatory = false;

                // Use the same logic as ajax_get_selected_carrier_react
                if (isset($settings['service_level'])) {
                    $mandatory_service_levels = [301, 307, 'BPSML02', 'BPSML04'];
                    
                    if (in_array($settings['service_level'], $mandatory_service_levels)) {
                        $showPickup = true;
                        $pickupMandatory = true;
                    }
                } elseif (isset($settings['pickupbehaviour'])) {
                    if ($settings['pickupbehaviour'] == BpostWooOrder::$PICKUP_BEHAVIOUR_MANDATORY) {
                        $showPickup = true;
                        $pickupMandatory = true;
                    } elseif ($settings['pickupbehaviour'] != BpostWooOrder::$PICKUP_BEHAVIOUR_IMPOSSIBLE) {
                        $showPickup = true;
                        $pickupMandatory = false;
                    }
                }

                if($showPickup) {
                    $Bpost_options .= "<tr><td><input type='hidden' name='shipping_carrier_id' id='shipping_carrier_id'/>";

                    $Bpost_options .= "
                        <button class='button alt Bpost-pick-location' type='button' onclick='Bpost.getPickupLocations(event)''>" .$Bpost->translate('Choose Pickup Location') . "</button> 
                        <script>

                        var Bpost_selected_pickup = '" . $Bpost->translate( 'Selected Pickup' ) . "';

                        var Bpost_geolocationfailed = '" . $Bpost->translate( 'geolocationfailed' ) . "';

                        var Bpost_mapfieldmandatory = '" . $Bpost->translate( 'mandatorypointmsg' ) . "';

                        var Bpost_choose_pickup_location = '" . $Bpost->translate( 'Choose Pickup Location' ) . "';

                        

                        // Hook into pickup selection and populate validation field
                        jQuery(document).ready(function() {
                            
                            // Clear any existing description content to prevent duplication
                            jQuery('.Bpost-pickup__description').empty();

                            // Override the pickup selection button behavior
                            jQuery('.Bpost-pickup__validate').on('click', function() {
                                setTimeout(function() {
                                    var pickupId = jQuery('#shipping_pickup_id').val();
                                    if (pickupId) {
                                        jQuery('#Bpostpickup').val(pickupId);
                                        console.log('Pickup selected, synced to validation field:', pickupId);
                                    }
                                }, 500);
                            });
                        });

                        // Clear description on checkout update to prevent duplicate content
                        jQuery(document).on('updated_checkout', function() {
                            jQuery('.Bpost-pickup__description').empty();
                        });
                        
                        </script>";
                       

                    // Add carrier ID initialization to the main script
                    wp_add_inline_script('bpost-pickup-script', "jQuery(function(){ Bpost.platform.setCarrier(" . esc_js($carrier->Id) . "); });");
                    $Bpost_options.= "<script> jQuery( function(){ Bpost.platform.setCarrier($carrier->Id); } ); </script>";    
                    $Bpost_options .= "</td></tr>";

                    $Bpost_options.=
                    "<input type='hidden' name='shipping_pickup_id' id='shipping_pickup_id'/>
                    <input type='hidden' name='shipping_pickup_label' id='shipping_pickup_label'/>
                    <input type='hidden' name='Bpost_pickup_extended' id='shipping_pickup_extended'/>
                    <span class='Bpost-pickup__description'></span>";
                }
                else {
                    $reason = "";
                    if (isset($settings['service_level'])) {
                        $reason = "service level {$settings['service_level']} does not support pickup points";
                    } elseif (isset($settings['pickupbehaviour']) && $settings['pickupbehaviour'] == BpostWooOrder::$PICKUP_BEHAVIOUR_IMPOSSIBLE) {
                        $reason = "pickup behaviour is set to IMPOSSIBLE";
                    } else {
                        $reason = "no valid pickup configuration found";
                    }
                    BpostWoo::log("$carrier->Name pickup not shown - $reason");
                }
            }
            else {
                BpostWoo::log( $carrier ? "$carrier->Name does not have pickup points " : "No carrier for ".$choosen_methods_woo[0]);
            }
        }
        else {
            BpostWoo::log("No Shipping method was choosen ");
        }

        $fragments['.Bpost-shipping-options'] = $Bpost_options.'</table>';

        return $fragments;
    }

    public function checkout_fields( $fields ) {
        $choosen_methods_woo = WC()->session->get( 'chosen_shipping_methods' );
        $is_required = false;
        
        if( isset($choosen_methods_woo[0]) ) {
            $settings = $this->get_settings_from_shipping_method_id($choosen_methods_woo[0]);

            if($settings) {
                // Use the same logic as other methods - check service level first
                if (isset($settings['service_level'])) {
                    $mandatory_service_levels = [301, 307, 'BPSML02', 'BPSML04'];
                    $is_required = in_array($settings['service_level'], $mandatory_service_levels);
                } elseif (isset($settings['pickupbehaviour'])) {
                    $is_required = ($settings['pickupbehaviour'] == BpostWooOrder::$PICKUP_BEHAVIOUR_MANDATORY);
                }
            }
        }

        $fields['order']['Bpostpickup'] = array(
            'label'     => "", # the label will still show up even if it's a hidden field
            'placeholder'   => '',
            'required'  => $is_required,
            'type' => 'hidden',
            'validate' => array('Bpostpickup'),
        );

        return $fields;
    }

    /**
     * @return bool does this carrier contain at least one option providing
     */
    public static function is_carrier_pickup_able($carrier) {
        $HasPickup = false;

        BpostWoo::log("is_carrier_pickup_able " . var_export($carrier,true));
        if (isset($carrier->OptionList)) {
            foreach($carrier->OptionList as $option) {
                if ($option->Type == 1 && isset($option->OptionValues)) { // Points in service levels
                    foreach($option->OptionValues as $optionValue) {
                        if(isset($optionValue->IsPickup) && $optionValue->IsPickup) {
                            BpostWoo::log("HasPickup for $carrier->Name found in $option->Name");
                            $HasPickup = true;
                        }
                    }
                } else if(isset($option->IsPickup) && $option->IsPickup > 0) { // Points in regular options
                    BpostWoo::log("HasPickup for $carrier->Name found in $option->Name");
                    $HasPickup = true;
                }

            }
        }

        return $HasPickup;
    }

    public function get_settings_from_shipping_method_id($shipping_method) {
        if (!$shipping_method) {
            return;
        }

        $matches = array();
        preg_match("/shipping_Bpost_([0-9]+)[a-z0-9\_]*\:?([0-9]*)?/", $shipping_method, $matches);

        if(empty($matches)) {
            return;
        }

        $shipping_method_id = $matches[1];
        $shipping_instance_id = $matches[2];


        if (stripos($shipping_method, '_weight')) { //wbs
            $settings =  get_option("wbs_" . $shipping_instance_id . "_Bpost");
            $msg = "wbs_" . $shipping_instance_id . "_Bpost";
        }
        else if (stripos($shipping_method, '_free')) {
            $settings = get_option('woocommerce_shipping_Bpost_' . $shipping_method_id . '_free_' . $shipping_instance_id . '_settings');
            $msg = '<br/>woocommerce_shipping_Bpost_' . $shipping_method_id.'_free_'.$shipping_instance_id.'_settings';
        }
        else { //flat rates
            $settings = get_option('woocommerce_shipping_Bpost_' . $shipping_method_id . '_' . $shipping_instance_id . '_settings');
            $msg = '<br/>woocommerce_shipping_Bpost_' . $shipping_method_id.'_'.$shipping_instance_id.'_settings';
        }

        BpostWoo::log("Selected Shipping Method: $shipping_method Carrier $shipping_method_id , instanceid $shipping_instance_id matches: " . wp_json_encode( $matches) . " $msg ");

        return $settings;
    }

    /**
     * Validate the checkout
     */
    public function checkout_validation($fields, $errors) {
        global $Bpost;

        $settings = $this->get_settings_from_shipping_method_id($fields['shipping_method'][0]);

        if (!$settings) {
            BpostWoo::log("Not a Bpost method");
            return array('error' => 'not a Bpost method ' . $fields['shipping_method'][0]);
        }

        $Bpostpoint = $fields['Bpostpickup'];
        $pickupRequired = false;
        
        // Use the same logic as other methods - check service level first
        if (isset($settings['service_level'])) {
            $mandatory_service_levels = [301, 307, 'BPSML02', 'BPSML04'];
            
            if (in_array($settings['service_level'], $mandatory_service_levels)) {
                $pickupRequired = true;
                BpostWoo::log("Pickup required for service level: {$settings['service_level']}");
            } else {
                BpostWoo::log("Pickup not required for service level: {$settings['service_level']}");
            }
        } elseif (isset($settings['pickupbehaviour'])) {
            if ($settings['pickupbehaviour'] == BpostWooOrder::$PICKUP_BEHAVIOUR_MANDATORY) {
                $pickupRequired = true;
                BpostWoo::log("Pickup required by pickup behaviour setting");
            } else {
                BpostWoo::log("Pickup not required by pickup behaviour: {$settings['pickupbehaviour']}");
            }
        }

        // Also check session as fallback (in case form field is empty but session has data)
        $session_pickup_id = WC()->session->get('shipping_pickup_id');
        
        $msg = "<br/>Selected Point: $Bpostpoint\nSession Pickup: $session_pickup_id\nPickup Required: " . ($pickupRequired ? 'Yes' : 'No') . "\n<br/>Settings " . var_export($settings,true);
        BpostWoo::log($msg);

        if ($pickupRequired && !$Bpostpoint && !$session_pickup_id) {
            $errors->add( 'validation', $Bpost->translate('mandatorypointmsg') );
            BpostWoo::log("Pickup validation failed - required but not selected");
        }

    }

    /**
     * Display field value on the order edit page
     */
    function checkout_pickup_field_display_admin_order_meta($order){
        ##Reseno
        $wc_order = wc_get_order( $order->get_id() ); // returns WC_Order object.

        $pickuppoint = $wc_order->get_meta( 'Bpostpickup', true );
        if ($pickuppoint) {
            echo '<p><strong>' . esc_html__('Pickup Point', 'bpost-shipping-platform') . ':</strong> ' . esc_html($order->get_meta('Bpostpickuplabel')) . '</p>';
        }
    }

    /**
     * Register the shipping methods available for this seller
     * @param array $methods - an array of registerd shipping methods
     */
    public function add_shipping_methods($methods){
        $Bpost_methods = get_option('Bpost_carriers');

        if(!$Bpost_methods) {
            return $methods;
        }

        $carriers = json_decode($Bpost_methods);

        foreach($carriers as $carrier){
            $methods['shipping_Bpost_' . $carrier->Id] = $this->get_class_name_for_carrier($carrier);
            $methods['shipping_Bpost_' . $carrier->Id . '_free'] = $this->get_class_name_for_carrier($carrier) . 'Free';
            if($this->wbs_active){
                $methods['shipping_Bpost_' . $carrier->Id.'_weight'] = $this->get_class_name_for_carrier($carrier) . 'Weight';
            }
        }
        return $methods;
    }

    /**
     * Woocommerce forces us to have one class per shipping method.
     * We'll create the file once.
     * Load the classes
     */
    public function Bpost_init_shipping() {
        BpostWoo::log( "Bpost_init_shipping " . $this->started );
        if ( $this->started++ ) {
            return;
        }

        $this->wbs_active = class_exists( '\Wbs\ShippingMethod');
        $carrier_json = get_option('Bpost_carriers');
        $carriers = json_decode($carrier_json);

        if ( !$carriers ) {
            return;
        }

        foreach ( $carriers as $carrier ) {
            $this->loadFlatRateCarrier( $carrier );
            $this->loadFreeShippingCarrier( $carrier );

            if($this->wbs_active){
                $this->loadWeightBasedCarrier( $carrier );
            }
        }

    }

    /**
     * Get the upload directory path for Bpost shipping files
     *
     * @return string The path to the Bpost shipping files directory
     */
    private function get_shipping_files_dir() {
        $upload_dir = wp_upload_dir();
        $bpost_dir = $upload_dir['basedir'] . '/bpost-shipping';

        // Create directory if it doesn't exist
        if (!file_exists($bpost_dir)) {
            wp_mkdir_p($bpost_dir);
        }

        // Ensure directory is writable
        if (!is_writable($bpost_dir)) {
            BpostWoo::log("Bpost shipping directory is not writable: $bpost_dir");
            return false;
        }

        return $bpost_dir;
    }

    public function loadFreeShippingCarrier($carrier){
        $class_name = $this->get_class_name_for_carrier($carrier) . 'Free';
        $file_name = 'class-Bpost-shipping' . $class_name . '.php';

        // Get the upload directory path
        $upload_dir = $this->get_shipping_files_dir();
        if (!$upload_dir) {
            BpostWoo::log("Failed to get upload directory for shipping carrier files");
            return;
        }

        $file_path = $upload_dir . '/' . $file_name;

        if( !file_exists($file_path) ) {
            $this->writeShippingClassFree( $file_path, $class_name, $carrier);
        }

        require_once ( $file_path );
    }

    public function loadFlatRateCarrier($carrier){
        $class_name = $this->get_class_name_for_carrier($carrier);
        $file_name = 'class-Bpost-shipping' . $class_name . '.php';

        // Get the upload directory path
        $upload_dir = $this->get_shipping_files_dir();
        if (!$upload_dir) {
            BpostWoo::log("Failed to get upload directory for shipping carrier files");
            return;
        }

        $file_path = $upload_dir . '/' . $file_name;

        if( !file_exists($file_path) ) {
            $this->writeShippingClass( $file_path, $class_name, $carrier);
        }

        require_once ( $file_path );
    }

    public function loadWeightBasedCarrier($carrier){
        $class_name = $this->get_class_name_for_carrier($carrier).'Weight';
        $weighbasedFile = 'class-Bpost-shipping' . $class_name . '-weight.php';

        // Get the upload directory path
        $upload_dir = $this->get_shipping_files_dir();
        if (!$upload_dir) {
            BpostWoo::log("Failed to get upload directory for shipping carrier files");
            return;
        }

        $file_path = $upload_dir . '/' . $weighbasedFile;

        if( !file_exists( $file_path ) ){
            $this->writeWeightShippingClass( $file_path, $class_name , $carrier );
        }

        require_once ( $file_path );
    }

    /**
     *  We detect if pickup is available client side so we need to know which shipping methods allow it
     */
    public function script_carriers_with_pickup() {
        global $Bpost;

        if (!is_checkout()) {
            return;
        }

        // Enqueue the main script
        wp_enqueue_script(
            'bpost-pickup-script',
            BPOST_PLUGIN_URL . 'assets/js/bpost-pickup.js',
            array('jquery'),
            BPOST_VERSION,
            true
        );

        // Add inline script with properly escaped variables
        $inline_script = "
            var Bpost_maps_key = '" . esc_js(get_option('Bpost_maps_key')) . "';
            var BPOST_PLUGIN_URL = '" . esc_js(BPOST_PLUGIN_URL) . "';
            var Bpost_icon_folder = BPOST_PLUGIN_URL +'/assets/images/markers/';
            var Bpost_no_points_found = '" . esc_js($Bpost->__("No pickup points returned by the carrier for this address")) . "';
            var Bpost_select = '" . esc_js($Bpost->__("Select")) . "';
            var Bpost_selected = '" . esc_js($Bpost->__("Selected")) . "';
            var Bpost_search = '" . esc_js($Bpost->__("Search")) . "';
            var Bpost_monday = '" . esc_js($Bpost->__("Monday")) . "';
            var Bpost_tuesday = '" . esc_js($Bpost->__("Tuesday")) . "';
            var Bpost_wednesday = '" . esc_js($Bpost->__("Wednesday")) . "';
            var Bpost_thursday = '" . esc_js($Bpost->__("Thursday")) . "';
            var Bpost_friday = '" . esc_js($Bpost->__("Friday")) . "';
            var Bpost_saturday = '" . esc_js($Bpost->__("Saturday")) . "';
            var Bpost_sunday = '" . esc_js($Bpost->__("Sunday")) . "';
            var Bpost_choose_pickup_location = '" . esc_js($Bpost->__("Choose Pickup Location")) . "';
            var Bpost_mandatory_point = '" . esc_js($Bpost->__("mandatorypointmsg")) . "';
            var Bpost_map = '" . esc_js($Bpost->__("Map")) . "';
            var Bpost_list = '" . esc_js($Bpost->__("List")) . "';
            var Bpost_the = '" . esc_js($Bpost->__("The")) . "';
            var Bpost_closest = '" . esc_js($Bpost->__("Closest")) . "';
            var Bpost_distance = '" . esc_js($Bpost->__("Distance")) . "';
            var Bpost_meter = '" . esc_js($Bpost->__("Meter")) . "';
            var Bpost_no_results = '" . esc_js($Bpost->__("Could not geolocate your address, please confirm that the address is correct")) . "';
            var Bpost_selected_pickup = '" . esc_js($Bpost->__("Selected Pickup")) . "';
            var Bpost_geolocationfailed = '" . esc_js($Bpost->__("geolocationfailed")) . "';
            var Bpost_mapfieldmandatory = '" . esc_js($Bpost->__("mapfieldmandatory")) . "';
        ";

        wp_add_inline_script('bpost-pickup-script', $inline_script);

        // Add the HTML structure with escaped output
        ?>
        <div class="Bpost-pickup">
            <div class="Bpost-pickup__overlay" onclick="Bpost.hideMap()"></div>
            <div class='Bpost-pickup__mapWrapper'>
                <div class='Bpost-pickup__options'>
                    <h2 class='Bpost-pickup__title'><?php echo esc_html($Bpost->translate('maptitle')); ?></h2>
                    <div class='Bpost-pickup__other'>
                    </div>
                    <button class='button Bpost-pickup__validate' onclick="Bpost.selectFromList()"><?php echo esc_html($Bpost->translate('Select')); ?></button>
                </div>
                <div class='Bpost-pickup__error'></div>
                <div class="Bpost-pickup__map" id='BpostMap'></div>
                <div class="Bpost-pickup__map-loader"><div class="Bpost-loader"><div></div><div></div><div></div></div></div>
            </div>
            <div class="Bpost-pickup__close" onclick="Bpost.hideMap()"></div>
        </div>
        <?php
    }

    /**
     *
     * @param object $carrier - the carrier object as returned by the api
     * @return a class name for this carrier
     */
    private function get_class_name_for_carrier( $carrier ) {
        $clean_name = preg_replace('/[^a-zA-Z0-9]+/', '_', $carrier->Name);

        return $clean_name;
    }

    /**
     * If there is a Bpost carrier associated with this rate_id return it
     */
    private function get_Bpost_carrier_from_table_rates( $choosen_method, $order_id = '' ) {
        $results = array();
        preg_match( "/wc_table_rate_plus_([\d]*)/", $choosen_method, $results );

        if ( !empty( $results ) ) {
            $Bpost_rates = get_option('Bpost_table_rate_shipping_plus');

            if( ! isset( $Bpost_rates[ $results[1] ] ) ){
                return;
            }

            $selected_rate = $Bpost_rates[ $results[1] ];

            if( $order_id ){
                ##Reseno
                $order = wc_get_order( $order_id ); // returns WC_Order object.
                $order->update_meta_data( 'Bpost_carrier', wp_json_encode($selected_rate) );
                $order->update_meta_data( 'table_rate_plus_rate_id', $results[1] );

                $order->save();

            }

            $carriers  = json_decode ( get_option( 'Bpost_carriers' ) );
            foreach( $carriers as $carrier ) {
                if($carrier->Id == $selected_rate['carrier_id']){
                    return $carrier;
                }
            }
        }
    }

    /**
     * Determine the carrier for this order which can be:
     *  + An instance of one of our methods
     *  + Determined by association if belongs to a different plugin
     *
     *   @param string $choosen_method - the method id choosen by the user
     *   @param int $orderid - optional - the order for which we are requesting this info
     */
    public function get_Bpost_carrier($choosen_method, $order_id ='') {
        BpostWoo::log('choosen_method ' . $choosen_method);

        if(stripos($choosen_method, 'table_rate_plus')) {
            return $this->get_Bpost_carrier_from_table_rates($choosen_method, $order_id);
        }

        if(! stripos($choosen_method, 'Bpost') ){
            return;
        }

        $method_parts = explode( ':' , $choosen_method );
        $method_id = $method_parts[0];

        $carriers  = json_decode ( get_option( 'Bpost_carriers' ) );

        foreach($carriers as $carrier){
            $Bpost_method_id = $this->get_shipping_method_id($carrier);
            if( $Bpost_method_id == $method_id || $Bpost_method_id . '_weight' == $method_id ||  $Bpost_method_id . '_free' == $method_id ){
                return $carrier;
            }
        }

    }

    /**
     * Get a unique id for woo
     * @param object $carrier - the carrier object as returned by the api
     * @return string - an id for this carrier
     */
    private function get_shipping_method_id( $carrier ) {
        return 'shipping_Bpost_'.$carrier->Id;
    }

    /**
     * Return a string to append to the class file refresenting this option
     */
    public  function get_option_string($type,$class,$optionname,$defaultvalue='',$options=''){
        $str= "\$this->instance_form_fields['$optionname'] = array(
                'title'             => \$translate('$optionname'),
                'type'              => '$type',
                'class'       => '$class',
                'default'           => $defaultvalue,";
        if($options) {
            $str.=" 'options' => $options";
        }
        $str.="  );
          \$this->$optionname = \$this->get_option( '$optionname' , '');";

        return $str;
    }

    /**
     * Since we are forced to declare  shipping classes we will generate them for the carriers available in the shop admin's contract.
     *
     * @param String $file_path - the absolute  file_path where to save this class
     * @param String $class_name  - the class name
     * @param Object $carrier - object returned by the api representing this carrier
     * @param String $service_level_options - optional - the options to append to the config in the format 'service_id_0' => 'service_label_0', 'service_id_1' => 'service_label_1' ...
     */
    public function writeShippingClass ( $file_path, $class_name , $carrier) {
        global $Bpost;

        $BpostOptions = BpostOptions::getInstance();

        /**
         * Ids that are safe to forward to the user
         * These serviçes must be GLOBAL to the carrier and not depend on factors like country
         * There is nothing in the endpoint that tells us what rules apply
         * So if you add something here make sure you  know  what your are doing
         * and if necessary modify the write shipping class to be smart enough to handle it.
         *
         * sendinsured are insurances of type 0 -  all type 0 show up in the same dropdown and are  mutually exclusive
         * sendinsuredV are insurances of type 2 - these are checkboxes
         */
        $extra_option_fields_ids = $BpostOptions->getAllowedExtraOptions();
        $checkbox_option_fields_ids  = $BpostOptions->getCheckboxFieldIds();

        $service_level_options = '';

        $checkbox_fields =array(); // an array of strings, each one is a checkbox field
        $extraoptions_field = '';
        $extraoptions_values = '';
        $optionvalues = array();

        $HasPickup = self::is_carrier_pickup_able($carrier);

        if (isset($carrier->OptionList)) {
            $pickup0 = $Bpost->translate('pickuppointbehavior0');
            $pickup1 = $Bpost->translate('pickuppointbehavior1');
            $pickup2 = $Bpost->translate('pickuppointbehavior2');

            if($HasPickup) {
                $extraoptions_field = "\n\n" . $this->get_option_string('select','Bpost-pickupbehaviour','pickupbehaviour',0,"array('0'=> \"$pickup0\", '1' => \"$pickup1\", '2' =>\"$pickup2\")");
            }

            foreach ($carrier->OptionList as $option) {
                switch($option->Type) {
                    case 0: //extra options these all go in the same select
                        //Filter stuff out if it's on the list treat it as a field with options
                        if (in_array($option->Id, $extra_option_fields_ids)) {
                            $extraoptions_values .= ($extraoptions_values ? ',':'')."'$option->Id'=>'$option->Name'";

                            if (isset($option->OptionFields)) {
                                foreach ($option->OptionFields as $field) {
                                    $curroptionvalues = array(
                                        'name' => 'extraoptions' . $option->Id,
                                        'class' => 'Bpost-extra-option-values',
                                        'values' => array()
                                    );
                                    if (isset($field->OptionValues) && is_array($field->OptionValues)) {
                                        foreach ($field->OptionValues as $optionValue) {
                                            array_push($curroptionvalues['values'], "\"$optionValue->Id\" =>\"$optionValue->Name\"");
                                        }
                                        array_push($optionvalues, $curroptionvalues);
                                    }
                                }
                            }
                        }
                        break;

                    case 1: //Service level -  we ALWAYS display items of this type
                        $service_level_options  = ' "" => "-" ';
                        if(isset($option->OptionValues )){
                            foreach ($option->OptionValues as $serviceLevel) {
                                $service_level_options .= " , '". $serviceLevel->Id ."'  => '$serviceLevel->Name'";
                            }
                        }
                        break;

                    default:
                        //checkbox type of fields type 2
                        //Filter stuff out if it's on the list
                        foreach ($checkbox_option_fields_ids as $key => $value) {
                            if ($key == $option->Id) {
                                $options = "array(0=>\$Bpost->translate('No'),'$option->Id'=>\$Bpost->translate('Yes'))";
                                array_push($checkbox_fields,$this->get_option_string('select','Bpost-'.$value,$value,0,$options));

                            }
                        }
                        break;
                }
            }  /** /Foreach optionList **/

            if($extraoptions_values){
                $extraoptions_field .= "\n\n" . $this->get_option_string('select','Bpost-extra-options','extraoptions',0,"array('0'=>'-',$extraoptions_values)");
                // Append any valid option values

                if (count($optionvalues)>1) {
                    foreach ($optionvalues as $option) {
                        $extraoptions_field .= "\n\n".$this->get_option_string('select',
                                $option['class'],
                                $option['name'],
                                0,
                                "array('0'=>'-'," . join(',',$option['values']) . ")");
                    }
                }
            }

        }


        // Only display the exclude classes if the advanced shipping plugin is active
        $excludeclasses = '';
        if ( is_plugin_active('woocommerce-advanced-shipping/woocommerce-advanced-shipping.php') ) {
            $excludeclasses = $this->get_option_string('multiplecheckboxes','Bpost-excludeclasses','excludeclasses',0,"");
        }

        BpostWoo::log( $carrier->Name . " ".(  isset($carrier->OptionList ) ? wp_json_encode( $carrier->OptionList )  :'' ));

        $service_level_field = $service_level_options ? $this->get_option_string('select','Bpost-service-level','service_level',0,"array($service_level_options)") : '';

        $max_value_field = "\$this->instance_form_fields['max_amount'] = array(
              'title'             => 'Maximum order amount',
              'type'              => 'text',
              'class'       => 'Bpost-shipping-level',
              'default'           => 0
          );";

        $class_contents = sprintf("<?php 
    /** 
     * Declares a shipping method for carrier {$carrier->Name} 
     */ 
    class {$class_name} extends WC_Shipping_Flat_Rate { 
        /**
         * Constructor.
         *
         * @param int \$instance_id Instance ID.
         */
        
        public \$has_pickup;
        public \$options;
        public \$service_level;
        public \$pickupbehaviour;
        public \$supports;
        public \$method_description;
        public \$method_title;
 
        
        public function __construct( \$instance_id = 0){
          global \$Bpost; 

          \$this->instance_id = absint( \$instance_id );
          \$this->id = '" . $this->get_shipping_method_id( $carrier ) .  "';
          \$this->title = preg_replace('/\b(shm|sml)\b/i', '', '{$carrier->Name}') .  'Flat Rate'; //name for end user 
          \$this->method_title =  preg_replace('/\b(shm|sml)\b/i', '', '{$carrier->Name}')  . 'Flat Rate'; //name for admin 
          \$this->method_description =  preg_replace('/\b(shm|sml)\b/i', '', '{$carrier->Name}') ; // description for admin 
          \$this->has_pickup = " . ($HasPickup ? 'true' : 'false' ). ";
      
          \$this->supports = array(
                'shipping-zones',
                'instance-settings',
                'instance-settings-modal',
          );

          // Default to returning the string passed by param 
          \$translate = function (\$str){ return \$str;}; 

          // how it's possible that someone declares this method before there's an instance of the plugin is a mistery to solve later 
          // possible they copied the code and did their own  rendition of the thing? 
          if(!\$Bpost && class_exists('BpostWoo')) {
            \$Bpost = BpostWoo::instance();
          }

          # If we have an instance of Bpost, then use that translate function 
          if(\$Bpost) {
            \$translate = function (\$str) { global \$Bpost; return \$Bpost->translate(\$str); };
          }

          \$this->init();
          \$this->options = get_option(\$this->id . '_' . \$this->instance_id . '_settings');
          
          /*Max amount field*/
          %s
          
          /*Service Level*/
          %s
          
          /*Extraoptions */ 
          %s

          /** checkboxfields **/  
          %s 

          /** Exclude classes **/ 
          %s

         
          add_action( 'woocommerce_update_options_shipping_' . \$this->id, array( \$this, 'process_admin_options' ) ); 
 
        } 

        public function validate_excludeclasses_field( \$key , \$value ) {
          if ( \$key === 'excludeclasses' ) {
            return empty(\$value) ? '' : implode( ',' , \$value );
          }
          return \$value;
        }

        public function get_admin_options_html()
        {
          if ( \$this->instance_id ) {
            \$settings_html = \$this->generate_settings_html( \$this->get_instance_form_fields(), false );
          } else {
            \$settings_html = \$this->generate_settings_html( \$this->get_form_fields(), false );
          }

          
          \$excludeclassesoptions = array();
          if ( is_plugin_active('woocommerce-advanced-shipping/woocommerce-advanced-shipping.php') ) { 
              \$shipping  = new \WC_Shipping(); 
              \$opt_exclude_classes = explode( ',', \$this->get_instance_option('excludeclasses') );
              
              foreach ( \$shipping->get_shipping_classes() as \$shipping_class ) {

                array_push( \$excludeclassesoptions, array( 
                  'id' => \$shipping_class->term_id,
                  'name' => \$shipping_class->name,
                  'selected' => in_array( \$shipping_class->term_id , \$opt_exclude_classes ) ? 'checked' : ''
                ));
              }
          }
          return '<table class=\"form-table\">' . \$settings_html . '</table><script>
          var optionsid = \"#woocommerce_' . \$this->id . '_extraoptions\";
          
          jQuery(\"#woocommerce_'. \$this->id . '_max_amount\").on(\"input\", function () {
                    const inputField = jQuery(this);
                    const value = inputField.val();
                
                    // Remove any existing error messages
                    jQuery(`#error-message`).remove();
                    jQuery(`#range-error-message`).remove();
                
                    // Check if the input contains only numbers
                    if (/^\d*$/.test(value)) {
                            inputField.val(value); // Allow only numeric input
                        } else {
                            // Remove non-numeric characters
                            const cleanedValue = value.replace(/\D/g, ``);
                        inputField.val(cleanedValue);
                
                        if (jQuery(`#error-message`).length === 0) {
                            inputField.after(`<div id=\"error-message\" style=\"color: red;\">Only numbers are allowed</div>`);
                        }
                    }
               
                });
          
                  function checkSelectedValue() {
            var selectedValue = jQuery(\"#woocommerce_shipping_Bpost_68_service_level\").val();
            var pickupBehaviourField = jQuery(`select[name=\"woocommerce_shipping_Bpost_68_pickupbehaviour\"]`);
            
            if (!pickupBehaviourField.length) {
                pickupBehaviourField = jQuery(`select[name=\"woocommerce_shipping_Bpost_71_pickupbehaviour\"]`);
            }
            var pickupBehaviourLabel = jQuery(`label[for=\"woocommerce_shipping_Bpost_68_pickupbehaviour\"]`);
    
            
            if (!pickupBehaviourLabel.length) {
                pickupBehaviourLabel = jQuery(`label[for=\"woocommerce_shipping_Bpost_71_pickupbehaviour\"]`);
            }
    
//            if (selectedValue == \"301\") {
//                pickupBehaviourField.show();
//                pickupBehaviourLabel.show();
//            } else {
                pickupBehaviourField.hide();
                pickupBehaviourLabel.hide();
//            }
        }

        // Attach the change event to the dropdown
        jQuery(\"#woocommerce_shipping_Bpost_68_service_level\").change(function() {
            checkSelectedValue();
        });
            checkSelectedValue();
          
//          setTimeout( function(){
//            console.log(\"Helloo from '.\$this->id.'\");
//
//            jQuery(\".Bpost-extra-option-values\").parent().parent().parent().hide();
//            Bpost_extraoption_values();
//
//            jQuery(optionsid).change(Bpost_extraoption_values); 
//
//            setExcludeClasses();
//          }, 0);

          function Bpost_extraoption_values(){
              var selectedoption = jQuery(optionsid).val(); 
              jQuery(\".Bpost-extra-option-values\").parent().parent().parent().hide();
              jQuery(\"#woocommerce_' . \$this->id . '_extraoptions\" + selectedoption).parent().parent().parent().show(); 
          }

          function setExcludeClasses() {
            var excludeoptions =' . wp_json_encode(\$excludeclassesoptions) . ';
            var select = jQuery(\"#woocommerce_shipping_Bpost_{$carrier->Id}_excludeclasses\"); 
            var content = select.parent();
            select.remove();  
            for ( var x=0; x< excludeoptions.length; ++x ) { 
              content.append(\'<span class=\"Bpost-ib Bpost-exclude-class\"> <input type=\"checkbox\" name=\"woocommerce_shipping_Bpost_{$carrier->Id}_excludeclasses[]\" value=\"\' + excludeoptions[x].id + \'\" \' + excludeoptions[x].selected + \' /> \' + excludeoptions[x].name + \'</span>\');
            }


          }
          </script>';
        }
    }",
            $max_value_field,
            $service_level_field,
            $extraoptions_field,
            join("\n",$checkbox_fields),
            $excludeclasses
        );

        $class_file = fopen( $file_path , 'w' );
        if( !fwrite( $class_file, $class_contents) ){
            BpostWoo::log("can't write to path: $file_path, classfile: $class_file please check your file permissions ");
        }

        fclose( $class_file );
    }


    /**
     * Since we are forced to declare  shipping classes we will generate them for the carriers available in the shop admin's contract.
     *
     * @param String $file_path - the absolute  file_path where to save this class
     * @param String $class_name  - the class name
     * @param Object $carrier - object returned by the api representing this carrier
     * @param String $service_level_options - optional - the options to append to the config in the format 'service_id_0' => 'service_label_0', 'service_id_1' => 'service_label_1' ...
     */
    public function writeShippingClassFree ( $file_path, $class_name , $carrier) {
        global $Bpost;

        $BpostOptions = BpostOptions::getInstance();

        /**
         * Ids that are safe to forward to the user
         * These serviçes must be GLOBAL to the carrier and not depend on factors like country
         * There is nothing in the endpoint that tells us what rules apply
         * So if you add something here make sure you  know  what your are doing
         * and if necessary modify the write shipping class to be smart enough to handle it.
         *
         * sendinsured are insurances of type 0 -  all type 0 show up in the same dropdown and are  mutually exclusive
         * sendinsuredV are insurances of type 2 - these are checkboxes
         */
        $extra_option_fields_ids = $BpostOptions->getAllowedExtraOptions();
        $checkbox_option_fields_ids  = $BpostOptions->getCheckboxFieldIds();

        $service_level_options = '';

        $checkbox_fields =array(); // an array of strings, each one is a checkbox field
        $extraoptions_field = '';
        $extraoptions_values = '';
        $optionvalues = array();
        $HasPickup = self::is_carrier_pickup_able($carrier);

        if (isset($carrier->OptionList)) {
            $pickup0 = $Bpost->translate('pickuppointbehavior0');
            $pickup1 = $Bpost->translate('pickuppointbehavior1');
            $pickup2 = $Bpost->translate('pickuppointbehavior2');

            if($HasPickup) {
                $extraoptions_field = "\n\n" . $this->get_option_string('select','Bpost-pickupbehaviour','pickupbehaviour',0,"array('0'=> \"$pickup0\", '1' => \"$pickup1\", '2' =>\"$pickup2\")");
            }

            foreach ($carrier->OptionList as $option) {
                switch($option->Type) {
                    case 0: //extra options these all go in the same select
                        //Filter stuff out if it's on the list treat it as a field with options
                        if (in_array($option->Id, $extra_option_fields_ids)) {
                            $extraoptions_values .= ($extraoptions_values ? ',':'')."'$option->Id'=>'$option->Name'";

                            if (isset($option->OptionFields)) {
                                foreach ($option->OptionFields as $field) {
                                    $curroptionvalues = array(
                                        'name' => 'extraoptions' . $option->Id,
                                        'class' => 'Bpost-extra-option-values',
                                        'values' => array()
                                    );
                                    if (isset($field->OptionValues) && is_array($field->OptionValues)) {
                                        foreach ($field->OptionValues as $optionValue) {
                                            array_push($curroptionvalues['values'], "\"$optionValue->Id\" =>\"$optionValue->Name\"");
                                        }
                                        array_push($optionvalues, $curroptionvalues);
                                    }
                                }
                            }
                        }
                        break;

                    case 1: //Service level -  we ALWAYS display items of this type
                        $service_level_options  = ' "" => "-" ';
                        if(isset($option->OptionValues )){
                            foreach ($option->OptionValues as $serviceLevel) {
                                $service_level_options .= " , '". $serviceLevel->Id ."'  => '$serviceLevel->Name'";
                            }
                        }
                        break;

                    default:
                        //checkbox type of fields type 2
                        //Filter stuff out if it's on the list
                        foreach ($checkbox_option_fields_ids as $key => $value) {
                            if ($key == $option->Id) {
                                $options = "array(0=>\$Bpost->translate('No'),'$option->Id'=>\$Bpost->translate('Yes'))";
                                array_push($checkbox_fields,$this->get_option_string('select','Bpost-'.$value,$value,0,$options));

                            }
                        }
                        break;
                }
            }  /** /Foreach optionList **/

            if($extraoptions_values){
                $extraoptions_field .= "\n\n" . $this->get_option_string('select','Bpost-extra-options','extraoptions',0,"array('0'=>'-',$extraoptions_values)");
                // Append any valid option values

                if (count($optionvalues)>1) {
                    foreach ($optionvalues as $option) {
                        $extraoptions_field .= "\n\n".$this->get_option_string('select',
                                $option['class'],
                                $option['name'],
                                0,
                                "array('0'=>'-'," . join(',',$option['values']) . ")");
                    }
                }
            }

        }

        // Only display the exclude classes if the advanced shipping plugin is active
        $excludeclasses = '';
        if ( is_plugin_active('woocommerce-advanced-shipping/woocommerce-advanced-shipping.php') ) {
            $excludeclasses = $this->get_option_string('multiplecheckboxes','Bpost-excludeclasses','excludeclasses',0,"");
        }

        BpostWoo::log( $carrier->Name . " ".(  isset($carrier->OptionList ) ? wp_json_encode( $carrier->OptionList )  :'' ));

        $service_level_field = $service_level_options ? $this->get_option_string('select','Bpost-service-level','service_level',0,"array($service_level_options)") : '';

        $class_contents = sprintf("<?php 
    /** 
     * Declares a shipping method for carrier {$carrier->Name} 
     */ 
    class {$class_name} extends WC_Shipping_Free_Shipping { 
        /**
         * Constructor.
         *
         * @param int \$instance_id Instance ID.
         */

        public \$has_pickup;
        public \$options;
        public \$service_level;
        public \$pickupbehaviour;
        public \$supports;
        public \$method_description;
        public \$method_title;
        
         
        public function __construct( \$instance_id = 0){
          global \$Bpost; 

          \$this->instance_id =  absint( \$instance_id );
          \$this->id = '" . $this->get_shipping_method_id( $carrier ) .  "_free';
          
            \$this->title = preg_replace('/\b(shm|sml)\b/i', '', '{$carrier->Name}') .  'Free Shipping'; //name for end user 
          \$this->method_title =  preg_replace('/\b(shm|sml)\b/i', '', '{$carrier->Name}')  . 'Free Shipping'; //name for admin 
          \$this->method_description =  preg_replace('/\b(shm|sml)\b/i', '', '{$carrier->Name}') . 'Free Shipping' ; // description for admin 
          

          \$this->has_pickup = " . ($HasPickup ? 'true' : 'false' ) . ";
      
          \$this->supports = array(
                'shipping-zones',
                'instance-settings',
                'instance-settings-modal',
          );

          \$this->init();

          // Default to returning the string passed by param 
          \$translate = function (\$str){ return \$str;}; 

          // how it's possible that someone declares this method before there's an instance of the plugin is a mistery to solve later 
          // possible they copied the code and did their own  rendition of the thing? 
          if(!\$Bpost && class_exists('BpostWoo')) {
            \$Bpost = BpostWoo::instance();
          }

          # If we have an instance of Bpost, then use that translate function 
          if(\$Bpost) {
            \$translate = function (\$str) { global \$Bpost; return \$Bpost->translate(\$str); };
          }

          /*Service Level*/
          %s
          
          /*Extraoptions */ 
          %s

          /** checkboxfields **/  
          %s 

          /** exclude classes **/
          %s

          add_action( 'woocommerce_update_options_shipping_' . \$this->id, array( \$this, 'process_admin_options' ) );
        } 

        public function validate_excludeclasses_field( \$key , \$value ) {
          if ( \$key === 'excludeclasses' ) {
            return empty(\$value) ? '' : implode( ',' , \$value );
          }
          return \$value;
        }
       
        /**
         * Initialize free shipping.
         */
        public function init() { 
          // Load the settings.

        \$this->instance_form_fields = array(
            'title'            => array(
              'title'       => __( 'Name', 'bpost-shipping-platform' ),
              'type'        => 'text',
              'description' => __( 'Your customers will see the name of this shipping method during checkout.', 'bpost-shipping-platform' ),
              'default'     => \$this->method_title,
              'placeholder' => __( 'e.g. Free shipping', 'bpost-shipping-platform' ),
              'desc_tip'    => true,
            ),
            'requires'         => array(
              'title'   => __( 'Free shipping requires', 'bpost-shipping-platform' ),
              'type'    => 'select',
              'class'   => 'wc-enhanced-select',
              'default' => '',
              'options' => array(
                ''           => __( 'No requirement', 'bpost-shipping-platform' ),
                'min_amount' => __( 'A minimum order amount', 'bpost-shipping-platform' ),
                'coupon'     => __( 'A valid free shipping coupon', 'bpost-shipping-platform' ),
              ),
            ),
            'min_amount'       => array(
              'title'             => __( 'Minimum order amount', 'bpost-shipping-platform' ),
              'type'              => 'text',
              'class'             => 'wc-shipping-modal-price',
              'placeholder'       => wc_format_localized_price( 0 ),
              'description'       => __( 'Customers will need to spend this amount to get free shipping.', 'bpost-shipping-platform' ),
              'default'           => '0',
              'desc_tip'          => true,
              'sanitize_callback' => array( \$this, 'sanitize_cost' ),
            ),
            'ignore_discounts' => array(
              'title'       => __( 'Coupons discounts', 'bpost-shipping-platform' ),
              'label'       => __( 'Apply minimum order rule before coupon discount', 'bpost-shipping-platform' ),
              'type'        => 'checkbox',
              'description' => __( 'If checked, free shipping would be available based on pre-discount order amount.', 'bpost-shipping-platform' ),
              'default'     => 'no',
              'desc_tip'    => true,
            ),
          );

          \$this->init_settings();

          // Define user set variables.
          \$this->title            = \$this->get_option( 'title' );
          \$this->min_amount       = \$this->get_option( 'min_amount', 0 );
          \$this->requires         = \$this->get_option( 'requires' );
          \$this->ignore_discounts = \$this->get_option( 'ignore_discounts' );

          // Actions.
          add_action( 'woocommerce_update_options_shipping_' . \$this->id, array( \$this, 'process_admin_options' ) );
        }

        public function get_admin_options_html()
        {
          if ( \$this->instance_id ) {
            \$settings_html = \$this->generate_settings_html( \$this->get_instance_form_fields(), false );
          } else {
            \$settings_html = \$this->generate_settings_html( \$this->get_form_fields(), false );
          }

          \$excludeclassesoptions = array();
          if ( is_plugin_active('woocommerce-advanced-shipping/woocommerce-advanced-shipping.php') ) { 
              \$shipping  = new \WC_Shipping(); 
              \$opt_exclude_classes = explode( ',', \$this->get_instance_option('excludeclasses') );               
              \$opt_exclude_classes = explode( ',', \$this->get_instance_option('excludeclasses') );
          
              foreach ( \$shipping->get_shipping_classes() as \$shipping_class ) {

                array_push( \$excludeclassesoptions, array( 
                  'id' => \$shipping_class->term_id,
                  'name' => \$shipping_class->name,
                  'selected' => in_array( \$shipping_class->term_id , \$opt_exclude_classes ) ? 'checked' : ''
                ));
              }
          }
          return '<table class=\"form-table\">' . \$settings_html . '</table><script>
          var optionsid = \"#woocommerce_' . \$this->id . '_extraoptions\";
          

            jQuery(document).ready(function () {
            
                jQuery(\"#woocommerce_'. \$this->id . '_min_amount\").on(\"input\", function () {
                    const inputField = jQuery(this);
                    const value = inputField.val();
            
                    // Check if the input contains only numbers
                    if (/^\d*$/.test(value)) {
                        // Remove the error message if it exists
                        jQuery(`#error-message`).remove();
                    } else {
                        // Remove non-numeric characters
                        const cleanedValue = value.replace(/\D/g, ``);
                        inputField.val(cleanedValue);
            
                        if (jQuery(`#error-message`).length === 0) {
                            inputField.after(`<div id=\"error-message\" style=\"color: red;\">Only numbers are allowed</div>`);
                        }
                    }
                    
                });


});

           
           jQuery(`label[for=\"woocommerce_' . \$this->id . '_ignore_discounts\"]`).closest(\"fieldset\").remove();

           
            jQuery(document).ready(function () {
            function toggleInput() {
                if (jQuery(\"#woocommerce_' . \$this->id . '_requires\").val() === `min_amount`) {
                    jQuery(\"#woocommerce_' . \$this->id . '_min_amount\").prop(`disabled`, false);
                } else {
                    jQuery(\"#woocommerce_' . \$this->id . '_min_amount\").prop(`disabled`, true);
                    jQuery(\"#woocommerce_' . \$this->id . '_min_amount\").val(``);
                    

                }
        }
        
        // Run check on page load
        toggleInput();
        
        // Run check on dropdown change
        jQuery(\"#woocommerce_' . \$this->id . '_requires\").on(`change`, toggleInput);
        });
          
          
                    function checkSelectedValue() {
            var selectedValue = jQuery(\"#woocommerce_shipping_Bpost_68_free_service_level\").val();
            var pickupBehaviourField = jQuery(`select[name=\"woocommerce_shipping_Bpost_68_free_pickupbehaviour\"]`);
            
            if (!pickupBehaviourField.length) {
                pickupBehaviourField = jQuery(`select[name=\"woocommerce_shipping_Bpost_71_free_pickupbehaviour\"]`);
            }
            
            var pickupBehaviourLabel = jQuery(`label[for=\"woocommerce_shipping_Bpost_68_free_pickupbehaviour\"]`);
    
            if (!pickupBehaviourLabel.length) {
                pickupBehaviourLabel = jQuery(`label[for=\"woocommerce_shipping_Bpost_71_free_pickupbehaviour\"]`);
            }
            
            
//            if (selectedValue == \"301\") {
//                pickupBehaviourField.show();
//                pickupBehaviourLabel.show();
//            } else {
                pickupBehaviourField.hide();
                pickupBehaviourLabel.hide();
//            }
        }

        // Attach the change event to the dropdown
        jQuery(\"#woocommerce_shipping_Bpost_68_free_service_level\").change(function() {
            checkSelectedValue();
        });
                    
         jQuery(\"#woocommerce_shipping_Bpost_71_free_service_level\").change(function() {
            checkSelectedValue();
        });
    
        checkSelectedValue();
          
          setTimeout( function(){
            console.log(\"Helloo from '.\$this->id.'\");

            jQuery(\".Bpost-extra-option-values\").parent().parent().parent().hide();
            Bpost_extraoption_values();

            jQuery(optionsid).change(Bpost_extraoption_values); 
            setExcludeClasses();

          }, 0);

          function Bpost_extraoption_values(){
              var selectedoption = jQuery(optionsid).val(); 
              jQuery(\".Bpost-extra-option-values\").parent().parent().parent().hide();
              jQuery(\"#woocommerce_' . \$this->id . '_extraoptions\" + selectedoption).parent().parent().parent().show(); 
          }

          function setExcludeClasses() {
            var excludeoptions =' . wp_json_encode(\$excludeclassesoptions) . ';
            var select = jQuery(\"#woocommerce_shipping_Bpost_{$carrier->Id}_free_excludeclasses\"); 
            var content = select.parent();
            select.remove();  
            for ( var x=0; x< excludeoptions.length; ++x ) { 
              content.append(\'<span class=\"Bpost-ib Bpost-exclude-class\"> <input type=\"checkbox\" name=\"woocommerce_shipping_Bpost_{$carrier->Id}_free_excludeclasses[]\" value=\"\' + excludeoptions[x].id + \'\" \' + excludeoptions[x].selected + \' /> \' + excludeoptions[x].name + \'</span>\');
            }
          }
          </script>';
        } 
    }",
            $service_level_field,
            $extraoptions_field,
            join("\n",$checkbox_fields),
            $excludeclasses
        );

        $class_file = fopen( $file_path , 'w' );
        if ( !fwrite( $class_file, $class_contents) ) {
            error_log("can't write to path: $file_path, classfile: $class_file please check your file permissions ");
        }

        fclose( $class_file );
    }
    /**
     * If the client has the weightbaseshipping extension installed allow them
     * to use it with Bpost Shipping Class
     */
    public function writeWeightShippingClass($file_path, $class_name, $carrier) {
        global $Bpost;

        $Bpostjs =  "var Bpost_carrier=" . addslashes(wp_json_encode($carrier)).";";

        if(isset($carrier->OptionList)){

            $BpostOptions = BpostOptions::getInstance();
            $Bpostjs .= "var Bpost_extraoptions=" . addslashes(wp_json_encode($BpostOptions->getAllowedExtraOptions())).";";
            $Bpostjs .= "var Bpost_checkboxes=" . addslashes(wp_json_encode($BpostOptions->getCheckboxFieldIds())).";";
        }

        $pickup_behaviour_label = "\$pickup_behaviour_label = \$Bpost->translate('pickupbehaviour')";

        $pickup0 = "\$pickup0 = \$translate('pickuppointbehavior0');";
        $pickup1 = "\$pickup1 = \$translate('pickuppointbehavior1');";
        $pickup2 = "\$pickup2 = \$translate('pickuppointbehavior2');";
        $extraoptions = "\$extraoptions = \$translate('extraoptions');";
        $servicelevel = "\$servicelevel = \$translate('service_level');";

        $Bpostjs .= "Bpost_labels = {
          'pickupbehaviour' : \\\"\$pickup_behaviour_label\\\",
          'pickup0' : \\\"\$pickup0\\\",
          'pickup1' : \\\"\$pickup1\\\",
          'pickup2' : \\\"\$pickup2\\\",
          'extraoptions': \\\"\$extraoptions\\\",
          'servicelevel':\\\"\$servicelevel\\\",
    };";

        $HasPickup = self::is_carrier_pickup_able($carrier);

        $class_contents = "<?php
    use Wbs\ShippingMethod; 

    /** 
     * Declares a shipping method for carrier {$carrier->Name} 
     */ 
    class {$class_name} extends ShippingMethod { 
        /**
         * Constructor.
         *
         * @param int \$instance_id Instance ID.
         */
         public \$has_pickup;
         
         
        public static \$instanceIds = [];
        public function __construct( \$instance_id = 0){ 

          \$this->instance_id        = absint( \$instance_id );
          \$this->id                 = '" . $this->get_shipping_method_id( $carrier ) .  "_weight';
          \$this->plugin_id = 'wbs';
          
             \$this->title = preg_replace('/\b(shm|sml)\b/i', '', '{$carrier->Name}') .  'for Weight Based Shipping'; //name for end user 
          \$this->method_title =  preg_replace('/\b(shm|sml)\b/i', '', '{$carrier->Name}')  . 'for Weight Based Shipping'; //name for admin 
          \$this->method_description =  preg_replace('/\b(shm|sml)\b/i', '', '{$carrier->Name}') . 'for Weight Based Shipping' ; // description for admin 
          
          \$this->has_pickup = " . ($HasPickup ? 'true' : 'false' ) . ";
          
          \$this->supports = array( 
            'shipping-zones',
            'instance-settings',
          );
          
          \$this->addInstanceIds(\$this->instance_id);

          \$this->init_settings();
          
          if (isset(\$_POST['instance_id']) && \$_POST['instance_id'] == \$instance_id && isset(\$_POST['new_title'])){

            register_setting('Bpost_group','Bpost_change_name_'.\$instance_id);
            update_option('Bpost_change_name_'.\$this->instance_id,\$_POST['new_title']);

            if (get_option('Bpost_change_name_'.\$this->instance_id)){

                \$this->title = get_option('Bpost_change_name_'.\$instance_id);
            }

        }


        if (get_option('Bpost_change_name_'.\$this->instance_id)){

            \$this->title = get_option('Bpost_change_name_'.\$instance_id);
        }
        }      
        
         public static function getInstanceIds() {
             register_setting('Bpost_group','Bpost_instanceIds');
            update_option('Bpost_instanceIds',self::\$instanceIds);
        }   

        /** 
         * @override 
         * We don't want our methods confused with the global settings which has instance_id= '' 
         * Only called in wp-admin/
         */ 
        public function get_option_key()
        {
            if(!\$this->instance_id ){
              return ''; 
            }

            \$option_key =  join('_', array_filter(array(
                \$this->plugin_id,
                \$this->instance_id,
                'config',
            )));
            
           self::getInstanceIds();


            return \$option_key;
        }

        public function get_admin_options_html()
        {
          global \$Bpost; 
          
          // Default to returning the string passed by param 
          \$translate = function (\$str){ return \$str;}; 

          // how it's possible that someone declares this method before there's an instance of the plugin is a mistery to solve later 
          // possible they copied the code and did their own  rendition of the thing? 
          if(!\$Bpost && class_exists('BpostWoo')) {
            \$Bpost = BpostWoo::instance();
          }

          # If we have an instance of Bpost, then use that translate function 
          if(\$Bpost) {
            \$translate = function (\$str) { global \$Bpost; return \$Bpost->translate(\$str); };
          }

            \$Bpost_options = wp_json_encode(get_option('wbs_'.\$this->instance_id.'_Bpost'));
            $pickup_behaviour_label;
            $pickup0
            $pickup1
            $pickup2
            $extraoptions
            $servicelevel

            ob_start(); 
                echo \"<script>
                $Bpostjs

                //previous options 
                var Bpost_options = \$Bpost_options;
                </script>\";
                /** @noinspection PhpIncludeInspection */
                include(Wbs\Plugin::instance()->meta->paths->tplFile);
            return ob_get_clean();
        }
        
         private function addInstanceIds(int \$instance_id)
    {
        if (!in_array(\$instance_id, self::\$instanceIds)) {
            array_push(self::\$instanceIds, \$instance_id);
        }
    }
    }";

        $class_file = fopen( $file_path , 'w' );
        if( !fwrite( $class_file, $class_contents)){
            error_log("can't write to $file_path, classfile: $class_file please check your file permissions ");
        }
        fclose( $class_file );
    }

    /**
     * Return a list of shipping methods present in this shop
     * remember to include checks for any plugin integration we support
     */
    static function get_shipping_methods() {
        $zones = WC_Shipping_Zones::get_zones();

        $methods = array();
        foreach ($zones as $zone) {
            $woomethods = $zone['shipping_methods'];
            foreach($woomethods as $id =>  $woomethod) {
                array_push($methods, array('id' => $woomethod->id . '_' . $woomethod->instance_id, 'title' => $zone['zone_name'] . ' > ' . $woomethod->method_title));
            }
        }
        return wp_json_encode($methods);
    }
}

