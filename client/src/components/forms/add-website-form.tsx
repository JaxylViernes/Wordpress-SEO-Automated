import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { insertWebsiteSchema } from "@shared/schema";
import { api } from "@/lib/api";
import { z } from "zod";

const formSchema = insertWebsiteSchema.extend({
  name: z.string().min(1, "Website name is required"),
  url: z.string().url("Please enter a valid URL"),
});

type FormData = z.infer<typeof formSchema>;

interface AddWebsiteFormProps {
  onSuccess: () => void;
}

export default function AddWebsiteForm({ onSuccess }: AddWebsiteFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      aiModel: "gpt-4o",
      autoPosting: true,
    },
  });

  const createWebsite = useMutation({
    mutationFn: api.createWebsite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/websites"] });
      toast({
        title: "Website Connected",
        description: "Your WordPress site has been successfully connected.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect website. Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createWebsite.mutate(data);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add New Website</DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="name">Website Name</Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="My WordPress Site"
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="url">Website URL</Label>
          <Input
            id="url"
            type="url"
            {...register("url")}
            placeholder="https://example.com"
          />
          {errors.url && (
            <p className="text-sm text-red-600 mt-1">{errors.url.message}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="wpUsername">WordPress Username</Label>
          <Input
            id="wpUsername"
            {...register("wpUsername")}
            placeholder="admin"
          />
          {errors.wpUsername && (
            <p className="text-sm text-red-600 mt-1">{errors.wpUsername.message}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="wpPassword">WordPress Password</Label>
          <Input
            id="wpPassword"
            type="password"
            {...register("wpPassword")}
            placeholder="••••••••"
          />
          {errors.wpPassword && (
            <p className="text-sm text-red-600 mt-1">{errors.wpPassword.message}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="aiModel">AI Model Preference</Label>
          <Select
            value={watch("aiModel")}
            onValueChange={(value) => setValue("aiModel", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select AI model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o">GPT-4</SelectItem>
              <SelectItem value="claude-3">Claude-3</SelectItem>
              <SelectItem value="auto-select">Auto-Select</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="autoPosting"
            checked={watch("autoPosting")}
            onCheckedChange={(checked) => setValue("autoPosting", !!checked)}
          />
          <Label htmlFor="autoPosting" className="text-sm">
            Enable automatic content posting (2x per week)
          </Label>
        </div>
        
        <div className="flex space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onSuccess}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-primary-500 hover:bg-primary-600"
            disabled={createWebsite.isPending}
          >
            {createWebsite.isPending ? "Connecting..." : "Connect Website"}
          </Button>
        </div>
      </form>
    </>
  );
}
