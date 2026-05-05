import { Redirect } from 'expo-router';

// This tab slot is replaced by the FAB in _layout.tsx
// Navigating here redirects to the chat modal
export default function ChatTab() {
  return <Redirect href="/(app)/chat" />;
}
