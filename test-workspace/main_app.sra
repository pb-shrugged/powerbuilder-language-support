
forward
global type main_app from application
end type

type variables
    data_manager idm_data_manager
    string is_formatted_date
end variables

forward prototypes
public function boolean initialize_app()
public subroutine process_data()
end prototypes

public function boolean initialize_app()
    // Initialize the application
    date ld_today
    
    // Create data manager instance
    idm_data_manager = create data_manager
    
    // Set connection string
    idm_data_manager.set_connection_string("Server=localhost;Database=mydb")
    
    // Format today's date
    ld_today = today()
    is_formatted_date = format_date(ld_today)
    
    // Connect to database
    return idm_data_manager.connect_to_database()
end function

public subroutine process_data()
    // Process some data
    integer li_result
    string ls_conn
    
    // Get connection string
    ls_conn = idm_data_manager.get_connection_string()
    
    // Calculate something
    li_result = calculate_sum(10, 20)
    
    // Validate
    if is_valid_string(ls_conn) then
        // Do something
    end if
end subroutine
