
forward
global type data_manager from nonvisualobject
end type

type variables
    string is_connection_string
    boolean ib_connected
end variables

forward prototypes
public function boolean connect_to_database()
public function string get_connection_string()
public subroutine set_connection_string(string as_conn_string)
end prototypes

public function boolean connect_to_database()
    // Connect to the database using the connection string
    if is_valid_string(is_connection_string) then
        ib_connected = true
        return true
    end if
    return false
end function

public function string get_connection_string()
    return is_connection_string
end function

public subroutine set_connection_string(string as_conn_string)
    is_connection_string = as_conn_string
end subroutine
