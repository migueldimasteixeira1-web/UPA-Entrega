import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CreditCard,
  Truck,
  Key,
  Link2,
  Clock,
  User,
  MapPin,
  Phone,
  ExternalLink,
  MessageSquare,
  Copy,
  Check,
  CheckCircle2,
  Circle,
  Package,
  Save,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { formatCurrency, formatDate, formatPhone } from '../lib/constants';
import { formatCpfDisplay } from '../lib/masks';
import FormField, { inputClassName } from '../components/FormField';
import StatusBadge from '../components/StatusBadge';
import CopyMessage from '../components/CopyMessage';
import Modal from '../components/Modal';
import Alert from '../components/Alert';

export default function OrderDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [editDelivery, setEditDelivery] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [note, setNote] = useState('');
  const [deliveryForm, setDeliveryForm] = useState({});
  const [actionError, setActionError] = useState('');
  const [modalError, setModalError] = useState('');
  const [copiedPublicLink, setCopiedPublicLink] = useState(false);

  const { data: order, isLoading, error: loadError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.getOrder(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['order', id] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

  const confirmPaymentMutation = useMutation({
    mutationFn: () => api.confirmPayment(id),
    onSuccess: () => {
      setActionError('');
      invalidate();
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : 'Erro ao confirmar pagamento'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (data) => api.updateStatus(id, data),
    onSuccess: () => {
      setActionError('');
      setModalError('');
      invalidate();
      setCancelModal(false);
      setCancelReason('');
    },
    onError: (err) => setModalError(err instanceof ApiError ? err.message : 'Erro ao atualizar status'),
  });

  const updateOrderMutation = useMutation({
    mutationFn: (data) => api.registerUberFlash(id, data),
    onSuccess: () => {
      setModalError('');
      invalidate();
      setEditDelivery(false);
    },
    onError: (err) => setModalError(err instanceof ApiError ? err.message : 'Erro ao registrar dados do Uber Flash'),
  });

  const addNoteMutation = useMutation({
    mutationFn: () => api.addNote(id, note),
    onSuccess: () => {
      setActionError('');
      invalidate();
      setNote('');
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : 'Erro ao salvar observação'),
  });

  const openEditDelivery = () => {
    setDeliveryForm({
      deliveryPin: order.deliveryPin || '',
      trackingLink: order.trackingLink || '',
      deliveryNotes: order.deliveryNotes || '',
    });
    setEditDelivery(true);
  };

  const handleStatusAction = (transition) => {
    if (transition.action === 'confirm_payment') {
      confirmPaymentMutation.mutate();
      return;
    }
    if (transition.requiresReason) {
      setCancelModal(true);
      return;
    }
    updateStatusMutation.mutate({ status: transition.to });
  };

  const handleCancel = () => {
    if (!cancelReason.trim()) return;
    updateStatusMutation.mutate({ status: 'CANCELADO', cancelReason });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-upa-600 border-t-transparent" />
      </div>
    );
  }

  if (loadError || !order) {
    return (
      <div className="max-w-lg mx-auto py-24">
        <Alert message={loadError instanceof ApiError ? loadError.message : 'Pedido não encontrado'} />
      </div>
    );
  }

  const publicUrl = order.publicTrackingUrl || `${window.location.origin}/acompanhar/${order.publicToken}`;

  const copyPublicLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopiedPublicLink(true);
    setTimeout(() => setCopiedPublicLink(false), 2000);
  };

  const flowSteps = [
    { label: 'Pagamento confirmado', done: order.paymentConfirmed },
    { label: 'Uber Flash registrado', done: order.uberFlashRegistered },
    { label: 'PIN informado', done: !!order.deliveryPin },
    { label: 'Estoque baixado', done: order.stockReserved },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-upa-800 mb-3">
            <ArrowLeft className="w-4 h-4" /> Voltar ao painel
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-800">{order.patientName}</h1>
            <StatusBadge status={order.status} size="lg" />
          </div>
          <p className="text-slate-500 mt-1">
            {order.orderNumber} · Criado em {formatDate(order.createdAt)}
            {order.stockReserved && (
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-medium">
                <Package className="w-3 h-3" /> Estoque baixado
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {order.allowedTransitions?.map((t) => (
            <button
              key={t.to}
              type="button"
              onClick={() => handleStatusAction(t)}
              disabled={confirmPaymentMutation.isPending || updateStatusMutation.isPending}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                t.to === 'CANCELADO'
                  ? 'bg-red-50 text-red-700 hover:bg-red-100'
                  : 'bg-upa-800 text-white hover:bg-upa-900'
              } disabled:opacity-60`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {actionError && <Alert message={actionError} onDismiss={() => setActionError('')} />}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-4">Dados do pedido</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Paciente</p>
                    <p className="font-medium">{order.patientName}</p>
                    {order.patientCpf && (
                      <p className="text-sm text-slate-500">CPF: {formatCpfDisplay(order.patientCpf)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Telefone</p>
                    <p className="font-medium">{formatPhone(order.patientPhone)}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">Endereço</p>
                  <p className="font-medium">{order.address}</p>
                  <p className="text-sm text-slate-600">{order.neighborhood}{order.city ? `, ${order.city}` : ''}</p>
                  {order.referencePoint && <p className="text-sm text-slate-500 mt-1">Complemento: {order.referencePoint}</p>}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Medicamentos</h3>
              <div className="space-y-2">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex justify-between bg-slate-50 rounded-lg px-4 py-2 text-sm">
                    <span>{item.medicationName}</span>
                    <span className="text-slate-500">{item.quantity} {item.unit}(s)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <h2 className="font-semibold text-slate-800">Pagamento e Uber Flash</h2>
              {order.canRegisterUberFlash && (
                <button
                  type="button"
                  onClick={openEditDelivery}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-upa-800 text-white text-sm font-medium hover:bg-upa-900 shadow-sm"
                >
                  Registrar dados do Uber Flash
                </button>
              )}
              {order.paymentConfirmed && order.uberFlashRegistered && !order.canRegisterUberFlash && !['ENTREGUE', 'CANCELADO'].includes(order.status) && (
                <button
                  type="button"
                  onClick={openEditDelivery}
                  className="text-sm text-upa-700 font-medium hover:text-upa-900"
                >
                  Editar dados do Uber Flash
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              {flowSteps.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-lg px-2 py-2 text-xs flex items-center gap-1.5 ${
                    item.done ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  {item.done ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="leading-tight">{item.label}</span>
                </div>
              ))}
            </div>

            {!order.paymentConfirmed && (
              <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
                <p className="font-medium">Pagamento pendente</p>
                <p className="mt-1 text-amber-800/90">
                  Confirme o pagamento do frete antes de registrar dados do Uber Flash.
                </p>
              </div>
            )}

            {order.paymentConfirmed && !order.uberFlashRegistered && order.status === 'FRETE_PAGO' && (
              <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900">
                <p className="font-medium">Pagamento confirmado</p>
                <p className="mt-1 text-blue-800/90">
                  Solicite a corrida no Uber Flash (fora do sistema) e registre o PIN aqui.
                </p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div className={`rounded-xl border p-4 ${order.paymentConfirmed ? 'border-emerald-100 bg-emerald-50/40' : 'border-amber-100 bg-amber-50/40'}`}>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                  <CreditCard className="w-4 h-4" /> Frete
                </div>
                <p className="text-xl font-bold text-slate-800">{formatCurrency(order.freightValue)}</p>
                <p className={`text-sm mt-1 ${order.paymentConfirmed ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {order.paymentConfirmed ? 'Pagamento confirmado' : 'Aguardando confirmação'}
                </p>
              </div>

              <div className={`rounded-xl border p-4 ${order.uberFlashRegistered ? 'border-blue-100 bg-blue-50/40' : 'border-slate-100'}`}>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                  <Truck className="w-4 h-4" /> Entrega
                </div>
                <p className="font-medium">{order.uberFlashRegistered ? 'Uber Flash' : 'Aguardando registro'}</p>
              </div>

              <div className={`rounded-xl border p-4 ${order.deliveryPin ? 'border-blue-200 bg-blue-50/60' : 'border-amber-100 bg-amber-50/50'}`}>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                  <Key className="w-4 h-4" /> PIN Uber Flash
                </div>
                <p className="font-mono font-bold text-lg">{order.deliveryPin || 'Pendente'}</p>
              </div>

              <div className={`rounded-xl border p-4 ${order.trackingLink ? 'border-upa-100 bg-upa-50/30' : 'border-slate-100'}`}>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                  <Link2 className="w-4 h-4" /> Rastreio
                </div>
                {order.trackingLink ? (
                  <a href={order.trackingLink} target="_blank" rel="noreferrer" className="text-upa-700 hover:underline text-sm break-all inline-flex items-center gap-1">
                    Abrir link <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <p className="text-slate-400">Não registrado</p>
                )}
              </div>
            </div>

            {order.deliveryNotes && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-medium text-slate-700 mb-1">Observações da entrega</p>
                <p>{order.deliveryNotes}</p>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-upa-700 hover:underline inline-flex items-center gap-1"
              >
                Abrir página pública <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={copyPublicLink}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                {copiedPublicLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedPublicLink ? 'Link copiado' : 'Copiar link do paciente'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" /> Mensagens prontas
            </h2>
            <div className="space-y-3">
              {order.messages?.map((msg) => (
                <CopyMessage key={msg.id} title={msg.title} text={msg.text} />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" /> Histórico
            </h2>
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {order.history?.map((entry) => (
                <div key={entry.id} className="relative pl-4 border-l-2 border-upa-200">
                  <p className="text-sm font-medium text-slate-800">{entry.action}</p>
                  {entry.details && <p className="text-sm text-slate-600 mt-0.5">{entry.details}</p>}
                  <p className="text-xs text-slate-400 mt-1">
                    {entry.user?.name || 'Sistema'} · {formatDate(entry.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-3">Adicionar observação</h2>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-upa-500 resize-none text-sm"
              placeholder="Registre uma observação no histórico..."
            />
            <button
              type="button"
              onClick={() => addNoteMutation.mutate()}
              disabled={!note.trim() || addNoteMutation.isPending}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 disabled:opacity-60"
            >
              <Save className="w-4 h-4" /> Salvar observação
            </button>
          </div>
        </div>
      </div>

      <Modal open={editDelivery} onClose={() => { setEditDelivery(false); setModalError(''); }} title="Registrar dados do Uber Flash">
        <div className="space-y-4">
          {modalError && <Alert message={modalError} onDismiss={() => setModalError('')} />}
          <p className="text-sm text-slate-600">
            Informe os dados gerados no app Uber Flash após solicitar a corrida manualmente.
          </p>
          <FormField
            label="PIN do Uber Flash"
            required
            hint="O PIN é gerado pelo Uber Flash, fora do sistema."
            htmlFor="deliveryPin"
          >
            <input
              id="deliveryPin"
              value={deliveryForm.deliveryPin || ''}
              onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryPin: e.target.value })}
              className={`${inputClassName()} font-mono`}
              placeholder="Código gerado pelo Uber Flash"
            />
          </FormField>
          <FormField label="Link de rastreio (opcional)" htmlFor="trackingLink">
            <input
              id="trackingLink"
              value={deliveryForm.trackingLink || ''}
              onChange={(e) => setDeliveryForm({ ...deliveryForm, trackingLink: e.target.value })}
              className={inputClassName()}
              placeholder="https://..."
            />
          </FormField>
          <FormField label="Observações da entrega (opcional)" htmlFor="deliveryNotes">
            <textarea
              id="deliveryNotes"
              value={deliveryForm.deliveryNotes || ''}
              onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryNotes: e.target.value })}
              rows={2}
              className={`${inputClassName()} resize-none`}
            />
          </FormField>
          <button
            type="button"
            onClick={() => updateOrderMutation.mutate({
              deliveryPin: deliveryForm.deliveryPin,
              trackingLink: deliveryForm.trackingLink,
              deliveryNotes: deliveryForm.deliveryNotes,
            })}
            disabled={updateOrderMutation.isPending || !deliveryForm.deliveryPin?.trim()}
            className="w-full py-3 rounded-xl bg-upa-800 text-white font-medium hover:bg-upa-900 disabled:opacity-60"
          >
            {updateOrderMutation.isPending ? 'Salvando...' : 'Salvar dados do Uber Flash'}
          </button>
        </div>
      </Modal>

      <Modal open={cancelModal} onClose={() => { setCancelModal(false); setModalError(''); }} title="Cancelar pedido">
        <div className="space-y-4">
          {modalError && <Alert message={modalError} onDismiss={() => setModalError('')} />}
          <p className="text-sm text-slate-600">
            Informe o motivo do cancelamento.
            {order.stockReserved
              ? ' O estoque reservado será devolvido automaticamente.'
              : ' Como o estoque ainda não foi baixado, não haverá devolução de quantidades.'}
          </p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none resize-none"
            placeholder="Motivo do cancelamento..."
          />
          <button
            type="button"
            onClick={handleCancel}
            disabled={!cancelReason.trim() || updateStatusMutation.isPending}
            className="w-full py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-60"
          >
            Confirmar cancelamento
          </button>
        </div>
      </Modal>
    </div>
  );
}
