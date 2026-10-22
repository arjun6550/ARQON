import { Link } from "react-router-dom";
export function NotFoundPage() {
  return (<><h1 className="page-title">Page not found</h1><Link to="/" className="link-action">Back home</Link></>);
}
