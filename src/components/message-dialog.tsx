import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type Message = { title: string; body: string };

/** One-button result dialog (import/export outcomes). */
export function MessageDialog({
  message,
  onClose,
}: {
  message: Message | null;
  onClose: () => void;
}) {
  return (
    <AlertDialog
      open={message !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{message?.title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {message?.body}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
