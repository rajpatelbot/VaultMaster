"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { OTPSchemaType, otpSchema } from "@keyguard/database/zod";
import { EncryprtedData, decrypt } from "@keyguard/lib";
import { Button, Input, Loader } from "@keyguard/ui";
import { LOCAL_STORAGE_ENC_DEC_SECRET } from "@keyguard/web/utils/envvariables";
import { getJSON } from "@keyguard/web/utils/localstorage";
import { trpc } from "@keyguard/web/utils/trpc";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import OtpInput from "react-otp-input";

type ModifiedOTPSchemaType = Pick<OTPSchemaType, "otp">;

const modifiedOTPSchema = otpSchema.omit({ email: true });

const defaultValues: ModifiedOTPSchemaType = {
  otp: "",
};

export default function VerifyOtpForm() {
  const router = useRouter();
  const [resendOTPTimer, setResendOTPTimer] = useState<number>(0);

  const { handleSubmit, formState, control, watch } = useForm<ModifiedOTPSchemaType>({
    defaultValues,
    resolver: zodResolver(modifiedOTPSchema),
    mode: "all",
  });

  const { errors, isDirty, isValid } = formState;

  const otpMutation = trpc.auth.verifyOTP.useMutation({
    onSuccess(data) {
      if (data.status === 200 && data.success) {
        toast.success(data?.message);
        router.push("/auth/set-master");
      }
    },
    onError(error) {
      toast.error(error?.message);
    },
  });

  const resendOtpMutation = trpc.auth.resendOTP.useMutation({
    onSuccess(data) {
      if (data.status === 200 && data.success) {
        toast.success(data?.message);
        setResendOTPTimer(120);
      } else {
        toast.error(data?.message);
      }
    },
    onError(error) {
      toast.error(error?.message);
    },
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendOTPTimer > 0) {
      interval = setInterval(() => {
        setResendOTPTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendOTPTimer]);

  const onOtpSubmit = useCallback(
    (data: ModifiedOTPSchemaType) => {
      const storedPerson = getJSON<EncryprtedData>("$stored_person_properties");
      if (storedPerson) {
        const decryptedData = decrypt<OTPSchemaType>(storedPerson, LOCAL_STORAGE_ENC_DEC_SECRET);
        const payload: OTPSchemaType = { email: decryptedData.email, ...data };
        otpMutation.mutate(payload);
      } else {
        toast.error("Something went wrong. Please try again");
        router.push("/auth/login");
      }
    },
    [otpMutation]
  );

  const onResendOTP = useCallback(() => {
    const storedPerson = getJSON<EncryprtedData>("$stored_person_properties");
    if (storedPerson) {
      const decryptedData = decrypt<OTPSchemaType>(storedPerson, LOCAL_STORAGE_ENC_DEC_SECRET);
      const payload = { email: decryptedData.email };
      resendOtpMutation.mutate(payload);
    } else {
      toast.error("Something went wrong. Please try again");
      router.push("/auth/signup");
    }
  }, [resendOtpMutation]);

  return (
    <form className="flex flex-col" onSubmit={handleSubmit(onOtpSubmit)}>
      <Controller
        name="otp"
        control={control}
        render={({ field }) => (
          <OtpInput
            numInputs={6}
            value={watch("otp")}
            renderSeparator={<span>&nbsp;&nbsp;</span>}
            containerStyle={"flex justify-between w-full"}
            renderInput={(props) => (
              <Input
                {...props}
                isMessageHide={true}
                error={errors?.otp?.message}
                style={{ textAlign: "center" }}
              />
            )}
            onChange={(props) => field.onChange(props)}
          />
        )}
      />

      <div className="my-2 flex items-center justify-between">
        {resendOTPTimer > 0 ? (
          <p className="text-muted-500 dark:text-muted-200 my-[7px] text-xs font-medium lg:text-sm">
            Resend in {resendOTPTimer} seconds
          </p>
        ) : (
          <p className="text-muted-500 dark:text-muted-200 flex items-center text-xs font-medium lg:text-sm">
            Haven&apos;t received or has it expired?
            {resendOtpMutation.isLoading ? (
              <Loader variant={"default"} size={"sm"} className="mx-3 my-[6px]" />
            ) : (
              <Button type="button" variant={"link"} className="px-2" onClick={onResendOTP}>
                Resend OTP
              </Button>
            )}
          </p>
        )}
      </div>

      <Button
        size={"lg"}
        type="submit"
        className="mt-2"
        disabled={otpMutation.isLoading || !isDirty || !isValid}>
        {otpMutation.isLoading ? <Loader variant={"secondary"} size={"sm"} /> : "Verify"}
      </Button>
    </form>
  );
}
