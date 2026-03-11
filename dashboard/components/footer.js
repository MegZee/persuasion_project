import React from "react";

const Footer = () => {
  return (
    <footer className="footer footer-center bg-gradient-to-r from-blue-800/30 to-purple-800/30 p-10 relative z-10 text-white">
      <aside>
        <p>© {new Date().getFullYear()} - Licensed under AGPL-3.0</p>
      </aside>
    </footer>
  );
};

export default Footer;
