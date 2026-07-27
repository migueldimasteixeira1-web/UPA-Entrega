import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Key,
  Clock,
  User,
  MapPin,
  Navigation,
  Phone,
  ExternalLink,
  MessageSquare,
  Copy,
  Check,
  Save,
  Share2,
  Truck,
  Printer,
  Route as RouteIcon,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { formatDate, formatPhone } from '../lib/constants';
import { formatCpfDisplay, buildMapsUrl } from '../lib/masks';
import { copyToClipboard, canShare, shareText } from '../lib/clipboard';
import StatusBadge from '../components/StatusBadge';
import CopyMessage from '../components/CopyMessage';
import Modal from '../components/Modal';
import Alert from '../components/Alert';

export default function OrderDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState('');
  const [modalError, setModalError] = useState('');
  const [copiedPublicLink, setCopiedPublicLink] = useState(false);
  const [copyLinkError, setCopyLinkError] = useState(false);
  const [sharedPublicLink, setSharedPublicLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  const { data: order, isLoading, error: loadError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.getOrder(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['order', id] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

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

  const addNoteMutation = useMutation({
    mutationFn: () => api.addNote(id, note),
    onSuccess: () => {
      setActionError('');
      invalidate();
      setNote('');
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : 'Erro ao salvar observação'),
  });

  const handleStatusAction = (transition) => {
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
    setCopyLinkError(false);
    const ok = await copyToClipboard(publicUrl);
    if (ok) {
      setCopiedPublicLink(true);
      setTimeout(() => setCopiedPublicLink(false), 2000);
    } else {
      setCopyLinkError(true);
      setTimeout(() => setCopyLinkError(false), 4000);
    }
  };

  const sharePublicLink = async () => {
    setCopyLinkError(false);
    const ok = await shareText({
      title: 'Acompanhamento UPA Entrega',
      text: `Acompanhe seu pedido: ${publicUrl}`,
      url: publicUrl,
    });
    if (ok) {
      setSharedPublicLink(true);
      setTimeout(() => setSharedPublicLink(false), 2000);
    }
  };

  const copyPin = async () => {
    const ok = await copyToClipboard(order.deliveryPin);
    if (ok) {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const canPrintLabel = !['PEDIDO_RECEBIDO', 'EM_SEPARACAO'].includes(order.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-upa-800 mb-3">
            <ArrowLeft className="w-4 h-4" /> Voltar ao painel
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{order.patientName}</h1>
            <StatusBadge status={order.status} size="lg" />
          </div>
          <p className="text-slate-500 mt-1">
            {order.orderNumber} · Criado em {formatDate(order.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {canPrintLabel && (
            <Link
              to={`/pedidos/${order.id}/etiqueta`}
              target="_blank"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              <Printer className="w-4 h-4" /> Imprimir etiqueta
            </Link>
          )}
          {order.allowedTransitions?.map((t) => (
            <button
              key={t.to}
              type="button"
              onClick={() => handleStatusAction(t)}
              disabled={updateStatusMutation.isPending}
              className={`flex-1 sm:flex-none min-h-11 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
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

      {order.status === 'AGUARDANDO_SAIDA' && (
        <div className="flex items-center gap-3 rounded-xl bg-upa-50 border border-upa-200 p-4 text-upa-900">
          <RouteIcon className="w-5 h-5 shrink-0 text-upa-700" />
          <p className="text-sm">
            Pedido pronto para sair. Vincule-o a uma rota de entrega em{' '}
            <Link to="/rotas" className="font-medium underline hover:text-upa-950">Rotas</Link>.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
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
                  <p className="font-medium">{order.street}, {order.number}</p>
                  {order.complement && <p className="text-sm text-slate-600">{order.complement}</p>}
                  <p className="text-sm text-slate-600">{order.neighborhood}{order.city ? `, ${order.city}` : ''}</p>
                  {order.referencePoint && <p className="text-sm text-slate-500 mt-1">Referência: {order.referencePoint}</p>}
                  <a
                    href={buildMapsUrl(order)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-upa-700 hover:text-upa-900"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Abrir no Maps
                  </a>
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
              {order.internalNotes && (
                <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-700 mb-1">Observação interna</p>
                  <p>{order.internalNotes}</p>
                </div>
              )}
              {order.patientNotes && (
                <div className="mt-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-700 mb-1">Observação para o paciente</p>
                  <p>{order.patientNotes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-5">Entrega</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-upa-200 bg-upa-50/60 p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Key className="w-4 h-4" /> PIN de confirmação
                  </div>
                  <button
                    type="button"
                    onClick={copyPin}
                    className="inline-flex items-center gap-1 text-xs text-upa-700 hover:text-upa-900 min-h-9 px-2 rounded-lg hover:bg-white/60"
                  >
                    {copiedPin ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedPin ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="font-mono font-bold text-lg select-text">{order.deliveryPin}</p>
                <p className="text-xs text-slate-500 mt-1">Gerado pelo sistema. O entregador solicita ao paciente no ato da entrega.</p>
              </div>

              <div className={`rounded-xl border p-4 ${order.route ? 'border-blue-100 bg-blue-50/40' : 'border-slate-100'}`}>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                  <Truck className="w-4 h-4" /> Rota / Entregador
                </div>
                {order.route ? (
                  <>
                    <p className="font-medium">{order.route.routeNumber}</p>
                    <p className="text-sm text-slate-600">{order.route.courier?.name}</p>
                  </>
                ) : (
                  <p className="text-slate-400">Ainda não atribuído</p>
                )}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-upa-700 hover:underline inline-flex items-center justify-center gap-1 min-h-11 px-3 py-2 rounded-lg bg-upa-50 sm:bg-transparent"
              >
                Abrir página pública <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={copyPublicLink}
                className={`inline-flex items-center justify-center gap-1.5 text-sm min-h-11 px-3 py-2.5 rounded-lg flex-1 sm:flex-none ${
                  copiedPublicLink
                    ? 'bg-emerald-50 text-emerald-700'
                    : copyLinkError
                      ? 'bg-amber-50 text-amber-800'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-200'
                }`}
              >
                {copiedPublicLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedPublicLink ? 'Link copiado' : copyLinkError ? 'Selecione o link' : 'Copiar link'}
              </button>
              {canShare() && (
                <button
                  type="button"
                  onClick={sharePublicLink}
                  className={`inline-flex items-center justify-center gap-1.5 text-sm min-h-11 px-3 py-2.5 rounded-lg flex-1 sm:flex-none ${
                    sharedPublicLink
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-upa-50 text-upa-800 hover:bg-upa-100 active:bg-upa-100'
                  }`}
                >
                  {sharedPublicLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                  {sharedPublicLink ? 'Enviado' : 'Compartilhar link'}
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
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
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
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

          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
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

      <Modal open={cancelModal} onClose={() => { setCancelModal(false); setModalError(''); }} title="Cancelar pedido">
        <div className="space-y-4">
          {modalError && <Alert message={modalError} onDismiss={() => setModalError('')} />}
          <p className="text-sm text-slate-600">Informe o motivo do cancelamento.</p>
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
