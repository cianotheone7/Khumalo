import { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './DateOfBirthPicker.css';

interface DateOfBirthPickerProps {
  value: string;
  onChange: (date: string) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export function DateOfBirthPicker({ 
  value, 
  onChange, 
  disabled = false,
  id,
  name 
}: DateOfBirthPickerProps) {
  // Parse the date string to a Date object
  const selectedDate = value ? new Date(value) : null;

  // Handle date change
  const handleChange = (date: Date | null) => {
    if (date) {
      // Format date as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${day}`);
    } else {
      onChange('');
    }
  };

  // Custom input component
  const CustomInput = forwardRef<HTMLInputElement, any>(({ value, onClick }, ref) => (
    <input
      ref={ref}
      type="text"
      value={value}
      onClick={onClick}
      readOnly
      disabled={disabled}
      id={id}
      name={name}
      placeholder="Click to select date"
      className="date-picker-input"
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      title="Click to open calendar"
    />
  ));

  CustomInput.displayName = 'CustomInput';

  return (
    <DatePicker
      selected={selectedDate}
      onChange={handleChange}
      dateFormat="yyyy-MM-dd"
      showYearDropdown
      showMonthDropdown
      dropdownMode="select"
      maxDate={new Date()}
      yearDropdownItemNumber={100}
      scrollableYearDropdown
      customInput={<CustomInput />}
      disabled={disabled}
      placeholderText="YYYY-MM-DD"
    />
  );
}

