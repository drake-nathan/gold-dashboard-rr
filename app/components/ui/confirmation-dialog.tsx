import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmationDialogProps {
  cancelText?: string;
  confirmText?: string;
  description: string;
  onCancel?: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
  variant?: "danger" | "default";
}

export const ConfirmationDialog = ({
  cancelText = "Cancel",
  confirmText = "Continue",
  description,
  onCancel,
  onConfirm,
  open,
  title,
  variant = "default",
}: ConfirmationDialogProps) => (
  <AlertDialog open={open}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onCancel}>{cancelText}</AlertDialogCancel>
        <AlertDialogAction
          className={
            variant === "danger" ?
              "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            : undefined
          }
          onClick={onConfirm}
        >
          {confirmText}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
