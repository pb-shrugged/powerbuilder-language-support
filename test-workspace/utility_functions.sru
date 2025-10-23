
forward
global type utility_functions from function_object
end type

forward prototypes
global function string format_date(date ad_date)
global function boolean is_valid_string(string as_input)
global function integer calculate_sum(integer ai_a, integer ai_b)
end prototypes

global function string format_date(date ad_date)
    // Format a date as YYYY-MM-DD
    return string(ad_date, "yyyy-mm-dd")
end function

global function boolean is_valid_string(string as_input)
    // Check if a string is valid (not null or empty)
    if isnull(as_input) or trim(as_input) = "" then
        return false
    end if
    return true
end function

global function integer calculate_sum(integer ai_a, integer ai_b)
    // Calculate the sum of two integers
    return ai_a + ai_b
end function
