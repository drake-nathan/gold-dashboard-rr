import * as React from "react";

export const resolveAsChild = (children: React.ReactNode, asChild = false) => {
  if (!asChild) {
    return { children, render: undefined as React.ReactElement | undefined };
  }

  const child = React.Children.only(children);

  if (!React.isValidElement(child)) {
    throw new Error("`asChild` expects a single React element child.");
  }

  return { children: undefined, render: child };
};

export const Slot = ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
  const child = React.Children.only(children);

  if (!React.isValidElement<Record<string, unknown>>(child)) {
    return null;
  }

  const mergedProps = {
    ...child.props,
    ...props,
    className: [child.props.className, props.className].filter(Boolean).join(" ") || undefined,
    style: {
      ...(child.props.style &&
      typeof child.props.style === "object" &&
      !Array.isArray(child.props.style)
        ? child.props.style
        : {}),
      ...(props.style && typeof props.style === "object" && !Array.isArray(props.style)
        ? props.style
        : {}),
    },
  };

  return React.cloneElement(child, mergedProps);
};

export const mergeRenderStyle = <TState,>(
  baseStyle: React.CSSProperties,
  style?: ((state: TState) => React.CSSProperties) | React.CSSProperties,
) =>
  typeof style === "function"
    ? (state: TState) => ({ ...baseStyle, ...style(state) })
    : { ...baseStyle, ...style };
