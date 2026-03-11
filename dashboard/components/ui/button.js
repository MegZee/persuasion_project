// UI/Button.js
import React from "react";

const Button = ({ children, onClick }) => {
  return (
    <button className="btn btn-primary" onClick={onClick}>
      {children}
    </button>
  );
};

export default Button;

// Children is the text that will be displayed on the button.
// Example <Button onClick={handleClick}>Primary</Button>.
// Primary will be the children and therefore the text displayed on the button.

// Note: children is a special prop that gets the value of the content between the opening and closing tags of the component.
