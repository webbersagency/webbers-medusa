import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sdk } from '../../lib/sdk';
import { Button, Container, Heading, Textarea, toast } from '@medusajs/ui';

type Note = {
  id: string;
  note: string;
};

type NoteResponse = {
  note?: Note | null;
};

type NoteUpdateResponse = {
  note: Note;
};

function capitalizeFirstLetter(val: string) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

const NoteWidget = ({ entityType, entityId }: { entityType: string; entityId: string }) => {
  const { t } = useTranslation('webbersMedusa');
  const [note, setNote] = useState('');
  const queryClient = useQueryClient();

  const { data: result, isLoading } = useQuery({
    queryFn: () => sdk.client.fetch<NoteResponse>(`/admin/note?entity_id=${entityId}&entity_type=${entityType}`),
    queryKey: [['note', entityId]],
  });

  useEffect(() => {
    if (result?.note?.note && !note) {
      setNote(result.note?.note);
    }
  }, [result]);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      return await sdk.client.fetch<NoteUpdateResponse>(`/admin/note`, {
        method: 'POST',
        body: {
          note: note,
          type: entityType,
          note_id: result?.note?.id,
          type_id: entityId,
        },
      });
    },
    onSuccess: async () => {
      toast.success(t('notes.success'));
      await queryClient.invalidateQueries({
        queryKey: [['note', entityId]],
      });
    },
  });

  const loading = isPending || isLoading;

  const onSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutate();
  };

  return (
    <Container className="divide-y p-0">
      <form onSubmit={onSave}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <Heading level="h2">{entityType === 'customer' || entityType === 'order'
              ? t(`notes.${entityType}`)
              : t('notes.entity', { entity: capitalizeFirstLetter(entityType) })}</Heading>

          <Button size="small" variant="primary" disabled={loading} type={'submit'} isLoading={loading}>
            {loading ? t('common.saving') : t('notes.save')}
          </Button>
        </div>

        <div className="flex flex-col gap-y-3 px-6 py-4">
          <Textarea
            name={'note'}
            value={note ?? ''}
            onChange={e => setNote(e.target.value)}
            style={{ minHeight: '150px' }}
          />
        </div>
      </form>
    </Container>
  );
};

export default NoteWidget;
