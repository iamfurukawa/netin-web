import { StorageManager } from "../media/StorageManager";
import { ReactionManager } from "../reactions/ReactionManager";

export function AdminPanel() {
  return <section className="admin-panel"><ReactionManager /><StorageManager /></section>;
}
