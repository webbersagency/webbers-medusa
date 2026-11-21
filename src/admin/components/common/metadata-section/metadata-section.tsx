import { useTranslation } from 'react-i18next';
import { ArrowDownMini, ArrowUpMini, ArrowUpRightOnBox, EllipsisVertical, Trash } from '@medusajs/icons';
import {
  Badge,
  Container,
  Heading,
  IconButton,
  Drawer,
  useToggleState,
  Button,
  clx,
  DropdownMenu,
  toast,
} from '@medusajs/ui';
import * as zod from '@medusajs/framework/zod';
import { z } from '@medusajs/framework/zod';
import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { ConditionalTooltip } from '../conditional-tooltip';
import { ComponentPropsWithoutRef, forwardRef } from 'react';
import { Form } from '../form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sdk } from '../../../lib/sdk.ts';
import { useDocumentDirection } from '../../hooks/use-document-direction.tsx';

type MetadataSectionProps<TData extends object> = {
  data: TData;
};

const MetadataFieldSchema = z.object({
  key: z.string(),
  disabled: z.boolean().optional(),
  value: z.any(),
});

const MetadataSchema = z.object({
  metadata: z.array(MetadataFieldSchema),
});

type FormSchema = zod.infer<typeof MetadataSchema>;

const METADATA_KEY_LABEL_ID = 'metadata-form-key-label';
const METADATA_VALUE_LABEL_ID = 'metadata-form-value-label';

export const MetadataSection = <TData extends object>({ data }: MetadataSectionProps<TData>) =>
  data && 'metadata' in data ? <MetadataEditor data={data} /> : null;

const MetadataEditor = <TData extends { metadata: unknown }>({ data }: { data: TData }) => {
  const { t } = useTranslation('webbersMedusa');
  const [state, open, close] = useToggleState();
  const direction = useDocumentDirection();
  const queryClient = useQueryClient();

  const metadata = data?.metadata as Record<string, any> | null;

  const methods = useForm<FormSchema>({
    defaultValues: {
      metadata: getDefaultValues(metadata),
    },
  });

  const { fields, insert, remove } = useFieldArray({
    control: methods.control,
    name: 'metadata',
  });

  function deleteRow(index: number) {
    remove(index);

    // If the last row is deleted, add a new blank row
    if (fields.length === 1) {
      insert(0, {
        key: '',
        value: '',
        disabled: false,
      });
    }
  }

  function insertRow(index: number, position: 'above' | 'below') {
    insert(index + (position === 'above' ? 0 : 1), {
      key: '',
      value: '',
      disabled: false,
    });
  }

  const numberOfKeys = data.metadata ? Object.keys(data.metadata).length : 0;

  const updateReview = useMutation({
    mutationFn: (formData: Record<string, any> | null) =>
      // @ts-ignore
      sdk.client.fetch(`/admin/reviews/${data?.id}`, {
        method: 'PATCH',
        body: {
          metadata: {
            ...formData,
          },
        },
      }),
    onSuccess: async () => {
      toast.success(t('metadata.success'));
      await queryClient.invalidateQueries({
        // @ts-ignore
        queryKey: ['review', data?.id],
      });
    },
    onError: e => {
      toast.error(t('metadata.error'), { description: e.message });
    },
  });

  const onSubmit = async (values: FormSchema) => {
    const parsedData = parseValues(values, metadata);

    await updateReview.mutateAsync(parsedData);
  };

  return (
    <>
      <Container className="flex items-center justify-between">
        <div className="flex items-center gap-x-3">
          <Heading level="h2">{t('metadata.title')}</Heading>
          <Badge size="2xsmall" rounded="full">
            {t('metadata.keyCount', { count: numberOfKeys })}
          </Badge>
        </div>
        <IconButton
          size="small"
          variant="transparent"
          className="text-ui-fg-muted hover:text-ui-fg-subtle"
          asChild
          aria-label={t('metadata.edit')}
          onClick={open}
        >
          <ArrowUpRightOnBox />
        </IconButton>
      </Container>
      <FormProvider {...methods}>
        <Drawer open={state} onOpenChange={close}>
          <Drawer.Content>
            <Drawer.Header>
              <h1 className="font-sans font-medium h1-core">{t('metadata.edit')}</h1>
            </Drawer.Header>
            <Drawer.Body>
              <div className="bg-ui-bg-base shadow-elevation-card-rest grid grid-cols-1 divide-y rounded-lg">
                <div className="bg-ui-bg-subtle grid grid-cols-2 divide-x rounded-t-lg">
                  <div className="txt-compact-small-plus text-ui-fg-subtle px-2 py-1.5">
                    <label id={METADATA_KEY_LABEL_ID}>{t('metadata.key')}</label>
                  </div>
                  <div className="txt-compact-small-plus text-ui-fg-subtle px-2 py-1.5">
                    <label id={METADATA_VALUE_LABEL_ID}>{t('metadata.value')}</label>
                  </div>
                </div>
                {fields.map((field, index) => {
                  const isDisabled = field.disabled || false;
                  let placeholder = '-';

                  if (typeof field.value === 'object') {
                    placeholder = '{ ... }';
                  }

                  if (Array.isArray(field.value)) {
                    placeholder = '[ ... ]';
                  }

                  return (
                    <ConditionalTooltip
                      showTooltip={isDisabled}
                      content={t('metadata.rowDisabled')}
                      key={field.id}
                    >
                      <div className="group/table relative">
                        <div
                          className={clx('grid grid-cols-2 divide-x', {
                            'overflow-hidden rounded-b-lg': index === fields.length - 1,
                          })}
                        >
                          <Form.Field
                            control={methods.control}
                            name={`metadata.${index}.key`}
                            render={({ field }) => {
                              return (
                                <Form.Item>
                                  <Form.Control>
                                    <GridInput
                                      aria-labelledby={METADATA_KEY_LABEL_ID}
                                      {...field}
                                      disabled={isDisabled}
                                      placeholder={t('metadata.key')}
                                    />
                                  </Form.Control>
                                </Form.Item>
                              );
                            }}
                          />
                          <Form.Field
                            control={methods.control}
                            name={`metadata.${index}.value`}
                            render={({ field: { value, ...field } }) => {
                              return (
                                <Form.Item>
                                  <Form.Control>
                                    <GridInput
                                      aria-labelledby={METADATA_VALUE_LABEL_ID}
                                      {...field}
                                      value={isDisabled ? placeholder : value}
                                      disabled={isDisabled}
                                      placeholder={t('metadata.value')}
                                    />
                                  </Form.Control>
                                </Form.Item>
                              );
                            }}
                          />
                        </div>
                        <DropdownMenu dir={direction}>
                          <DropdownMenu.Trigger
                            className={clx(
                              "invisible absolute inset-y-0 -end-2.5 my-auto group-hover/table:visible data-[state='open']:visible",
                              {
                                hidden: isDisabled,
                              }
                            )}
                            disabled={isDisabled}
                            asChild
                          >
                            <IconButton size="2xsmall">
                              <EllipsisVertical />
                            </IconButton>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Content>
                            <DropdownMenu.Item className="gap-x-2" onClick={() => insertRow(index, 'above')}>
                              <ArrowUpMini className="text-ui-fg-subtle" />
                              {t('metadata.insertAbove')}
                            </DropdownMenu.Item>
                            <DropdownMenu.Item className="gap-x-2" onClick={() => insertRow(index, 'below')}>
                              <ArrowDownMini className="text-ui-fg-subtle" />
                              {t('metadata.insertBelow')}
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item className="gap-x-2" onClick={() => deleteRow(index)}>
                              <Trash className="text-ui-fg-subtle" />
                              {t('metadata.deleteRow')}
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu>
                      </div>
                    </ConditionalTooltip>
                  );
                })}
              </div>
            </Drawer.Body>
            <Drawer.Footer>
              <Button variant="secondary" type="submit" onClick={close} size={'small'}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" type="submit" onClick={methods.handleSubmit(onSubmit)} size={'small'}>
                {t('common.save')}
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer>
      </FormProvider>
    </>
  );
};

const GridInput = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<'input'>>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      {...props}
      autoComplete="off"
      className={clx(
        'txt-compact-small text-ui-fg-base placeholder:text-ui-fg-muted disabled:text-ui-fg-disabled disabled:bg-ui-bg-base bg-transparent px-2 py-1.5 outline-none',
        className
      )}
    />
  );
});
GridInput.displayName = 'MetadataForm.GridInput';

const EDITABLE_TYPES = ['string', 'number', 'boolean'];

function getDefaultValues(metadata?: Record<string, any> | null): z.infer<typeof MetadataFieldSchema>[] {
  if (!metadata || !Object.keys(metadata).length) {
    return [
      {
        key: '',
        value: '',
        disabled: false,
      },
    ];
  }

  return Object.entries(metadata).map(([key, value]) => {
    if (!EDITABLE_TYPES.includes(typeof value)) {
      return {
        key,
        value: value,
        disabled: true,
      };
    }

    let stringValue = value;

    if (typeof value !== 'string') {
      stringValue = JSON.stringify(value);
    }

    return {
      key,
      value: stringValue,
      original_key: key,
    };
  });
}

function parseValues(
  values: z.infer<typeof MetadataSchema>,
  original?: Record<string, any> | null
): Record<string, any> | null {
  const metadata = values.metadata;

  const isEmpty = !metadata.length || (metadata.length === 1 && !metadata[0].key && !metadata[0].value);

  if (isEmpty) {
    return null;
  }

  const update: Record<string, any> = {};

  // First, handle removed keys from original
  if (original) {
    Object.keys(original).forEach(originalKey => {
      const exists = metadata.some(field => field.key === originalKey);
      if (!exists) {
        update[originalKey] = '';
      }
    });
  }

  metadata.forEach(field => {
    let key = field.key;
    let value = field.value;
    const disabled = field.disabled;

    if (!key) {
      return;
    }

    if (disabled) {
      update[key] = value;
      return;
    }

    key = key.trim();
    value = value?.trim() ?? '';

    // We try to cast the value to a boolean or number if possible
    if (value === 'true') {
      update[key] = true;
    } else if (value === 'false') {
      update[key] = false;
    } else {
      const isNumeric = /^-?\d*\.?\d+$/.test(value);
      if (isNumeric) {
        update[key] = parseFloat(value);
      } else {
        update[key] = value;
      }
    }
  });

  return update;
}

// function getHasUneditableRows(metadata?: Record<string, any> | null) {
//   if (!metadata) {
//     return false
//   }
//
//   return Object.values(metadata).some(
//     (value) => !EDITABLE_TYPES.includes(typeof value)
//   )
// }
