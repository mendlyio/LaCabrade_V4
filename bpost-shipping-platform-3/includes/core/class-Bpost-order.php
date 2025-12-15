<?php
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * An abstract class for the order, contains the basic structure
 * for a Bpost order object and forces implementation of
 * platform-dependent methods
 *
 * @package Bpost.core
 * @since 1.0.0
 */
abstract class BpostOrder {

    // Status constants
    public static $STATUS_NOT_EXPORTED = 1;
    public static $STATUS_EXPORTED_SUCCESSFULLY = 2;
    public static $STATUS_EXPORT_ERRORS = 3;
    public static $STATUS_TEST_SUCCESSFUL = 4;
    public static $LABEL_STATUS_NOT_REQUESTED = 5;
    public static $LABEL_STATUS_PRINTED = 6;
    public static $LABEL_STATUS_ERROR = 7;
    public static $ERROR_ORDER_EXISTS = 200;

    // Pickup behaviour constants
    public static $PICKUP_BEHAVIOUR_OPTIONAL = 0;
    public static $PICKUP_BEHAVIOUR_MANDATORY = 1;
    public static $PICKUP_BEHAVIOUR_IMPOSSIBLE = 2;

    // Order details properties
    public $ShopItemId = null;
    protected $CompanyName = null;
    protected $Name = null;
    protected $ClientReferenceCode = null;
    protected $Streetname1 = null;
    protected $Streetname2 = null;
    protected $HouseNumber = null;
    protected $NumberExtension = null;
    protected $PostalCode = null;
    protected $City = null;
    protected $State = null;
    protected $Country = null;
    protected $Neighborhood = null;
    protected $CPF = null;
    protected $CNPJ = null;
    protected $Phone = null;
    protected $Transporter = '';
    protected $Email = null;
    protected $Weight = null;
    protected $Length = null;
    protected $Height = null;
    protected $Width = null;
    protected $CustomsType = null;
    protected $Description = null;
    protected $HSCode = null;
    protected $Value = null;
    protected $PointId = null;
    protected $ExtendedInfo = array();
    protected $ShippingMethodId = '';
    protected $ShippingMethodName = '';
    protected $errors = array();
    protected $Bpost_status = 0;
    protected $Bpost_message = '';
    protected $extraOptionId = '';
    protected $ShipmentItems = array();
    protected $OptionList = array();

    // Status text mapping
    public static $status_text = array(
        1 => 'Not Exported',
        2 => 'Exported',
        3 => 'Exported Error',
        4 => 'Test Successful'
    );

    /**
     * Constructor for BpostOrder.
     *
     * @param string $id - the system identifier for the order.
     * @return BpostOrder
     */
    public function __construct($id) {
        $this->ShopItemId = sanitize_text_field($id);
        $this->bootstrap();
    }

    /**
     * Executes the SQL received by param. Each platform will have a different way of accessing the database.
     *
     * @param string $sql
     * @param array $params
     * @return bool - true if the query succeeded, false otherwise
     */
    abstract protected function executeSQL($sql, $params);

    /**
     * Insert order meta. Don't forget to escape the strings.
     *
     * @param mixed $order_id - the type is defined by the platform, usually int but it can be a string
     * @param int $status
     * @param int $carrier_id
     * @param int $pickup_id
     * @param string $pickup_label
     * @param string $pickup_extended
     * @param string $tracking_id
     * @param string $message
     * @return bool - true if the query succeeded, false otherwise
     */
    public function add_order_meta($order_id, $status, $carrier_id, $pickup_id, $pickup_label, $pickup_extended, $tracking_id = '', $message = '') {
        $sql = "INSERT INTO `{$this->db_prefix}Bpost` (id, `status`, carrier_id, pickup_id, pickup_label, pickup_extended, tracking_id, message)
                VALUES(%d, %d, %d, %d, %s, %s, %s, %s)";
        return $this->executeSQL($sql, [
            absint($order_id),
            absint($status),
            absint($carrier_id),
            absint($pickup_id),
            sanitize_text_field($pickup_label),
            sanitize_text_field($pickup_extended),
            sanitize_text_field($tracking_id),
            sanitize_textarea_field($message)
        ]);
    }

    /**
     * Sets the order status.
     *
     * @param int $order_id
     * @param int $status
     * @return bool - true if the query succeeded, false otherwise
     */
    public function set_order_status($order_id, $status) {
        $sql = "UPDATE `{$this->db_prefix}Bpost` SET status=%d WHERE id=%d";
        return $this->executeSQL($sql, [
            absint($status),
            absint($order_id)
        ]);
    }

    /**
     * Set label meta for an order.
     *
     * @param int $order_id
     * @param int $status
     * @param string $labelurl
     * @param string $msg
     * @return bool - true if the query succeeded, false otherwise
     */
    public function set_label_meta($order_id, $status, $labelurl, $msg) {
        if (!$order_id) {
            error_log("No order ID was provided to set the label meta, ignoring");
            return false;
        }

        $msg = '<br/>' . gmdate('Y-m-d') . ' ' . sanitize_textarea_field($msg);
        $sql = "UPDATE `{$this->db_prefix}Bpost` SET status=%d, message=%s, labelurl=%s WHERE id=%d";
        error_log("\n\n$msg");
        return $this->executeSQL($sql, [
            absint($status),
            $msg,
            esc_url_raw($labelurl),
            absint($order_id)
        ]);
    }

    /**
     * Set the transporter (carrier ID) for this order.
     *
     * @param int $carrier_id
     */
    public function set_transporter($carrier_id) {
        $this->Transporter = absint($carrier_id);
    }

    /**
     * Execute an SQL SELECT query.
     *
     * @param string $sql
     * @param array $params
     * @return mixed - the results of the query
     */
    abstract protected function sqlSelect($sql, $params);

    /**
     * Get the necessary fields from the system and translate the system order into a Bpost order.
     */
    abstract protected function bootstrap();

    /**
     * Set the client reference code after applying necessary filters.
     */
    abstract protected function set_client_reference();

    /**
     * Set the message for this order.
     *
     * @param string $message
     */
    public function set_message($message) {
        $sql = "UPDATE {$this->db_prefix}Bposts SET message=%s WHERE id=%d";
        $this->executeSQL($sql, [
            sanitize_textarea_field($message),
            absint($this->ShopItemId)
        ]);
    }

    /**
     * Add a message to the existing list of messages.
     *
     * @param string $message
     */
    public function add_message($message) {
            // Skip saving messages that contain "Invalid country code"
            if (strpos($message, 'Invalid country code') !== false) {
                return false;
            }

            $meta = $this->get_order_meta();
            $previous_message = '';

            if ($meta) {
                if (is_array($meta) && isset($meta['message'])) {
                    $previous_message = sanitize_textarea_field($meta['message']);
                } elseif (is_object($meta) && isset($meta->message)) {
                    $previous_message = sanitize_textarea_field($meta->message);
                }
            }

            // Only add pipe separator if there's a previous message
            $new_message = !empty($previous_message) ? $previous_message . "|" . $message : $message;

            $sql = "UPDATE {$this->db_prefix}Bpost SET message=%s WHERE id=%d";
            return $this->executeSQL($sql, [
                $new_message,
                absint($this->ShopItemId)
            ]);
    }


    /**
     * Appends a new line and the current date to a message.
     *
     * @param string $message
     * @return string - formatted message
     */
    public static function get_formated_message($message) {
        return "<br/>".gmdate("d/m").' - '.$message;
    }

    /**
     * Get the client reference code.
     *
     * @return string
     */
    public function getClientReferenceCode() {
        return $this->ClientReferenceCode;
    }

    /**
     * Append errors to the order.
     *
     * @param mixed $errors - array(Id, Tekst)
     */
    public function append_errors($errors) {
        $messages = '';

        foreach ($errors as $error) {
            if (isset($error->Id) && $error->Id == BpostOrder::$ERROR_ORDER_EXISTS) {
                $this->set_status(BpostOrder::$STATUS_EXPORTED_SUCCESSFULLY);
                $this->add_message($this->get_formated_message("Order Exists"));
            } else {
                $messages .= $this->get_formated_message(isset($error->Tekst) ? sanitize_textarea_field($error->Tekst) : var_export($error, true));
            }
        }

        $this->add_message($messages);
    }

    /**
     * Set the status for this order.
     *
     * @param int $status
     */
    public function set_status($status) {
        $sql = "UPDATE `{$this->db_prefix}Bpost` SET status=%d WHERE id=%d";
        $this->executeSQL($sql, [
            absint($status),
            absint($this->ShopItemId)
        ]);
    }

    /**
     * Set the status of the order based on API response.
     *
     * @param int $status - this is mapped in tables shared between the plugin and the API - check the plugin docs
     */
    abstract public function set_status_from_api($status);

    /**
     * Set the tracking ID for this order.
     *
     * @param string $tracking_id
     */
    abstract public function set_tracking_id($tracking_id);

    /**
     * Returns the status the user selected in the plugin options as order status to export on "export all".
     *
     * @return array - valid statuses, type will depend on platform, either string or int
     */
    abstract public static function get_valid_status_to_export_all();

    /**
     * If there is no meta for this order, create it.
     *
     * @param int $order_id
     */
    public function grant_order_meta_exists($order_id) {
        $meta = self::get_order_meta($order_id);

        if (!$meta) {
            $sql = "INSERT INTO `{$this->db_prefix}Bpost` (`id`) VALUES(%d)";
            $this->executeSQL($sql, [
                absint($order_id)
            ]);
        }
    }

    /**
     * Get the country for this order.
     *
     * @return string
     */
    public function get_country() {
        return $this->Country;
    }

    /**
     * Get the carrier ID associated with this order according to the API.
     *
     * @return int
     */
    public function get_carrier_id() {
        return $this->Transporter;
    }

    /**
     * Retrieve Bpost metadata for the order.
     *
     * @return mixed - metadata for the order
     */
    public function get_order_meta()
    {
        $sql = "SELECT * FROM `{$this->db_prefix}Bpost` WHERE id=%d";
        $results = $this->sqlSelect($sql, [
            $this->ShopItemId
        ]);

        return count($results) ? $results[0] : null;
    }

    /**
     * Return the status for this order.
     *
     * @return int
     */
    public function get_order_status() {
        return $this->Bpost_status;
    }

    /**
     * Returns the Bpost message for this order.
     *
     * @return string
     */
    public function get_order_message() {
        return $this->Bpost_message;
    }

    /**
     * Get the client reference for this order.
     *
     * @return string
     */
    public function get_client_reference() {
        return $this->ClientReference;
    }

    /**
     * Get the shop item ID for this order.
     *
     * @return mixed
     */
    public function get_shop_item_id() {
        return $this->ShopItemId;
    }

    /**
     * Get the state for this order.
     *
     * @return string
     */
    public function get_state() {
        return $this->State;
    }

    /**
     * Get all error messages for this order.
     *
     * @return string - concatenated error messages
     */
    public function get_error_messages() {
        $errors = '';

        foreach ($this->errors as $error) {
            $errors .= sanitize_textarea_field($error);
        }

        return $errors;
    }

    /**
     * Check if this order is valid.
     *
     * @return bool - true if the order is valid, false otherwise
     */
    public function is_valid() {
        return $this->is_name_valid() && $this->is_address_valid();
    }

    /**
     * Check if the name for this order is valid.
     *
     * @return bool - true if the name is valid, false otherwise
     */
    public function is_name_valid() {
        if (!($nameValid = !empty($this->Name))) {
            $this->errors[] = 'Name is required';
        }
        return $nameValid;
    }

    /**
     * Check if the weight for this order is valid.
     *
     * @return bool - true if the weight is valid, false otherwise
     */
    public function is_weight_valid() {
        return $this->Weight && is_numeric($this->Weight);
    }

    /**
     * Checks if the address is correctly set for this order.
     *
     * @since 1.0.0
     * @return bool - true if the address contains all required fields, false otherwise
     */
    public function is_address_valid() {
        $addressValid = (trim($this->Streetname1) || trim($this->Streetname2)) != '' && trim($this->PostalCode) != '' && trim($this->City) != '' && trim($this->Country) != '';

        if (!$addressValid) {
            $this->errors[] = 'Invalid Shipping Address 
            <br/>Streetname1: ' . esc_html($this->Streetname1)
                . '<br/>Streetname2: ' . esc_html($this->Streetname2)
                . '<br/>Postalcode: ' . esc_html($this->PostalCode)
                . '<br/>City: ' . esc_html($this->City)
                . ' <br/>Country: ' . esc_html($this->Country);
        }

        return $addressValid;
    }

    /**
     * Normalize data to avoid errors.
     */
    public function normalizeData() {
        if (is_numeric($this->Streetname2)) {
            $this->HouseNumber = $this->Streetname2;
            $this->Streetname2 = "";
        }

        if ($this->Phone && strlen($this->Phone) < 3) {
            $this->add_message($this->get_formated_message("Invalid Phone [{$this->Phone}] ignoring"));
            $this->Phone = '';
        }

        if ($this->State && strlen($this->State) < 2) {
            $this->add_message($this->get_formated_message("Invalid State [{$this->State}] ignoring"));
            $this->State = '';
        }

        if ($this->CompanyName && strlen($this->CompanyName) < 3) {
            $this->add_message($this->get_formated_message("Invalid CompanyName[{$this->CompanyName}] ignoring "));
            $this->CompanyName = '';
        }

        $this->Description = $this->escape_text_data($this->Description);

        if ($this->Description && strlen($this->Description) > 255) {
            $this->Description = substr($this->Description, 0, 255);
            $chars = str_split($this->Description);

            for ($i = 254; $i > 251; --$i) {
                if ($chars[$i] == '&') {
                    $this->Description = substr($this->Description, 0, $i);
                }
            }
        }

        if ($this->PostalCode && strlen($this->PostalCode) > 15) {
            $originalPostalCode = $this->PostalCode;

            $words = explode(" ", $this->PostalCode);
            $validPostalCode = '';
            for ($i = 0; $i < count($words) && strlen($validPostalCode . " " . $words[$i]) < 15; ++$i) {
                $validPostalCode .= ($i ? " " : "") . $words[$i];
            }

            $this->PostalCode = $validPostalCode;
            $this->add_message($this->get_formated_message("$originalPostalCode too large. Ignoring city name, will send $this->PostalCode"));
        }
    }

    /**
     * Remove all non-Latin1 characters from a string.
     *
     * @param string $str
     * @return string
     */
    public function escape_non_latin1($str) {
        $normalize = array(
            // Add mapping here
        );
        return strtr($str, $normalize);
    }

    /**
     * Escape text data to make it safe for output and storage.
     *
     * @param string $str
     * @return string
     */
    public function escape_text_data($str) {
        if (is_null($str)) {
            return;
        }
        $str = preg_replace("/\r|\n|\t|\'|\"/", " ", $str);
        $str = html_entity_decode(stripslashes($str), ENT_QUOTES, 'UTF-8');
        $str = $this->escape_non_latin1($str);
        $ar = preg_split('/(?<!^)(?!$)/u', $str);  // Split into array of characters
        $str2 = '';
        foreach ($ar as $c) {
            $o = ord($c);
            $charInBytes = strlen($c);

            if ($charInBytes < 3 && ($o > 31 || strlen($c) > 1)) {
                $str2 .= $c;
            } else {
                $str2 .= ' ';
            }
        }
        return trim($str2);
    }

    /**
     * Get the properties to be exported to the API.
     *
     * @param array|null $changesAddress
     * @return object
     */
    public function get_api_props($changesAddress = null) {
        $this->normalizeData();
        $orderMeta = $this->get_order_meta();

        if ($changesAddress) {
            $data = array(
                'ShopItemId' => $this->ShopItemId,
                'ClientReferenceCode' => sanitize_text_field($this->ClientReferenceCode),
                "Address" => array(
                    "CompanyName" => $this->escape_text_data($changesAddress['company']),
                    'Name' => $this->escape_text_data($changesAddress['first_name'] . " " . $changesAddress['last_name']),
                    'Streetname1' => $this->escape_text_data($changesAddress['address_1']),
                    'Streetname2' => $this->escape_text_data($this->Streetname2),
                    'HouseNumber' => $this->escape_text_data($changesAddress['address_2']),
                    'NumberExtension' => sanitize_text_field($this->NumberExtension),
                    'PostalCode' => $this->escape_text_data($changesAddress['postcode']),
                    'City' =>  $this->escape_text_data($changesAddress['city']),
                    'State' => $this->escape_text_data($changesAddress['state']),
                    'Country' => $this->escape_text_data($changesAddress['country']),
                    'Phone' => sanitize_text_field($changesAddress['phone']),
                    'Email' => sanitize_email(trim($this->Email)),
                    'CPF' => sanitize_text_field($this->CPF),
                    'CNPJ' => sanitize_text_field($this->CNPJ),
                    'Neighborhood' => sanitize_text_field($this->Neighborhood)
                ),
                "OptionList" => $this->OptionList
            );
        } else {
            $data = array(
                'ShopItemId' => $this->ShopItemId,
                'ClientReferenceCode' => sanitize_text_field($this->ClientReferenceCode),
                "Address" => array(
                    "CompanyName" => $this->escape_text_data($this->CompanyName),
                    'Name' => $this->escape_text_data($this->Name),
                    'Streetname1' => $this->escape_text_data($this->Streetname1),
                    'Streetname2' => $this->escape_text_data($this->Streetname2),
                    'HouseNumber' => sanitize_text_field($this->HouseNumber),
                    'NumberExtension' => sanitize_text_field($this->NumberExtension),
                    'PostalCode' => sanitize_text_field($this->PostalCode),
                    'City' =>  $this->escape_text_data($this->City),
                    'State' => $this->escape_text_data($this->State),
                    'Country' => $this->escape_text_data($this->Country),
                    'Phone' => sanitize_text_field($this->Phone),
                    'Email' => sanitize_email(trim($this->Email)),
                    'CPF' => sanitize_text_field($this->CPF),
                    'CNPJ' => sanitize_text_field($this->CNPJ),
                    'Neighborhood' => sanitize_text_field($this->Neighborhood)
                ),
                "OptionList" => $this->OptionList
            );
        }

        if ($this->Description && strlen(trim($this->Description)) > 3) {
            $data["Customs"] = array(
                'CustomsType' => absint($this->CustomsType),
                'Description' => $this->escape_text_data(substr($this->Description, 0, 40)),
//                'HSCode' => sanitize_text_field($this->HSCode),
                'Type' => '',
                'Value' => $this->Value ? number_format($this->Value, 2, '.', '') : ''
            );
        }

        if ($this->ShippingMethodId) {
            $data['ShippingMethodId'] = sanitize_text_field($this->ShippingMethodId);
        }

        if ($this->ShippingMethodName) {
            $data['ShippingMethodName'] = sanitize_text_field($this->ShippingMethodName);
        }

        if ($this->Transporter && is_numeric($this->Transporter)) {
            $data['Carrier'] = array(
                "Id" => absint($this->Transporter),
            );
        }

        if ($this->Weight != '') {
            $data['Weight'] = absint($this->Weight);
        }

        if ($this->Length || $this->Width || $this->Height) {
            $data['Dimensions'] = array(
                'Width' => absint($this->Width),
                'Length' => absint($this->Length),
                'Height' => absint($this->Height),
            );
        }

        if (!is_null($orderMeta) && $orderMeta->pickup_id) {
            $data["PickupPoint"] = array(
                "PointId" => sanitize_text_field($orderMeta->pickup_id),
            );

            if ($orderMeta->pickup_extended) {
                $data["PickupPoint"]["ExtendedInfo"] = sanitize_text_field($orderMeta->pickup_extended);
            }
        }

        if ($this->extraOptionId) {
            array_push($data['OptionList'], array(
                "Id" => absint($this->extraOptionId)
            ));
        }

        if (!empty($this->ShipmentItems)) {
            $data['ShipmentItems'] = $this->ShipmentItems;
        }

        if (!isset($data["PickupPoint"]) && isset($data['OptionList'][0]['Value']) && $data['OptionList'][0]['Value'] == '301') {
            $data['OptionList'][0]['Value'] = "302";
        }

        return (object) $data;
    }

    /**
     * Update order meta. Don't forget to escape the strings.
     *
     * @param mixed $order_id - the type is defined by the platform, usually int but it can be a string
     * @param int $status
     * @param int $carrier_id
     * @param int $pickup_id
     * @param string $pickup_label
     * @param string $pickup_extended
     * @param string $tracking_id
     * @param string $message
     * @return bool - true if the query succeeded, false otherwise
     */
    public function update_order_meta($order_id, $status, $carrier_id, $pickup_id, $pickup_label, $pickup_extended, $tracking_id = '', $message = '') {
        $sql = "UPDATE `{$this->db_prefix}Bpost` 
                SET `status` =  %d, 
                carrier_id=%d,
                pickup_id =%d,
                pickup_label = %s,
                pickup_extended = %s,
                tracking_id=%s,
                message=%s
                WHERE id=%d";

        return $this->executeSQL($sql, [
            absint($status),
            absint($carrier_id),
            absint($pickup_id),
            sanitize_text_field($pickup_label),
            sanitize_text_field($pickup_extended),
            sanitize_text_field($tracking_id),
            sanitize_textarea_field($message),
            absint($order_id)
        ]);
    }
}