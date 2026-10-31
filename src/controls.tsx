import {
  Children,
  isValidElement,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type OptionHTMLAttributes,
  type ChangeEvent,
} from "react";
import InputBase from "@mui/material/OutlinedInput";
import Checkbox from "@mui/material/Checkbox";
import Slider from "@mui/material/Slider";
import MuiSelect from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
export { default as Button } from "@mui/material/Button";

// Keep the existing native-input event contract for stat-expression validation.
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, value, defaultValue, disabled, type, ...inputProps } =
    props;
  if (type === "checkbox")
    return (
      <Checkbox
        className={className}
        checked={props.checked}
        defaultChecked={props.defaultChecked}
        disabled={disabled}
        onChange={props.onChange}
        inputProps={{ "aria-label": props["aria-label"] }}
      />
    );
  if (type === "range")
    return (
      <Slider
        className={className}
        disabled={disabled}
        value={Number(value)}
        min={Number(props.min)}
        max={Number(props.max)}
        step={Number(props.step)}
        aria-label={props["aria-label"]}
        onChange={(_, next) =>
          props.onChange?.({
            target: { value: String(next) },
          } as ChangeEvent<HTMLInputElement>)
        }
      />
    );
  return (
    <InputBase
      className={`control-input ${className ?? ""}`}
      type={type}
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
      inputProps={inputProps}
    />
  );
}
export function Select(
  props: SelectHTMLAttributes<HTMLSelectElement> & {
    shortLabels?: Record<string, string>;
    nativeChoices?: boolean;
  },
) {
  return (
    <MuiSelect
      className={props.className}
      native={props.nativeChoices}
      value={props.value as string | number}
      renderValue={
        props.shortLabels
          ? (value) => props.shortLabels?.[String(value)] ?? String(value)
          : undefined
      }
      disabled={props.disabled}
      SelectDisplayProps={{ "aria-label": props["aria-label"] ?? props.title }}
      inputProps={{ "aria-label": props["aria-label"] ?? props.title }}
      title={props.title}
      onChange={(e) =>
        props.onChange?.(e as unknown as ChangeEvent<HTMLSelectElement>)
      }
      MenuProps={{ disableScrollLock: true }}
    >
      {props.nativeChoices ? props.children : Children.map(props.children, (child) =>
        isValidElement<OptionHTMLAttributes<HTMLOptionElement>>(child) ? (
          <MenuItem value={child.props.value as string | number}>
            {child.props.children}
          </MenuItem>
        ) : null,
      )}
    </MuiSelect>
  );
}
