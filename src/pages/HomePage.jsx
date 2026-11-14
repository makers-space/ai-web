import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import { useNotification } from '@contexts/NotificationContext';
import { Page, Container, Card, Button, Typography, Icon, Badge, Input, Select, Divider, Data, Flow, TreeView, ProgressBar } from '@components/Components';
import { deviceService, modelService, describeError, useActivity } from '../client/ai.client';
import { CopyButton } from './ChatPage';

const FIRST_PROMPT_KEY = 'mollama-first-prompt';

const node = (id, label, column, row, color, shape = 'rectangle') => ({
    id, type: 'editable', position: { x: column * 220, y: row * 100 }, data: { label, color, shape }
});
const edge = (source, target, label) => ({ id: `${source}-${target}`, source, target, label, type: 'smoothstep' });

const DEMOS = [
    {
        id: 'table',
        icon: 'FiGrid',
        chip: 'Compare options',
        prompt: 'Compare three laptops for a student: price, weight and battery life.',
        reply: 'Here are three that fit a student budget. The Air is the lightest; the Vivobook is the cheapest.',
        render: () => (
            <Data
                size="xs"
                width="100%"
                variant="table"
                sortable={false}
                searchable={false}
                filterable={false}
                paginated={false}
                data={[
                    { laptop: 'Vivobook 15', price: '$549', weight: '1.7 kg', battery: '8 hours' },
                    { laptop: 'IdeaPad Slim 5', price: '$699', weight: '1.5 kg', battery: '11 hours' },
                    { laptop: 'MacBook Air', price: '$999', weight: '1.2 kg', battery: '15 hours' }
                ]}
            />
        )
    },
    {
        id: 'diagram',
        icon: 'FiGitBranch',
        chip: 'Draw a process',
        prompt: 'Draw how an online order gets from checkout to the customer.',
        reply: 'The order is checked for payment first. A refused payment ends the flow early.',
        render: () => (
            <Flow
                height="280px"
                connectable={false}
                deletable={false}
                enableNodeCreation={false}
                nodes={[
                    node('placed', 'Order placed', 0, 0, 'primary'),
                    node('paid', 'Payment OK?', 1, 0, 'warning', 'diamond'),
                    node('packed', 'Packed', 2, 0, 'secondary'),
                    node('sent', 'Delivered', 3, 0, 'success', 'circle'),
                    node('refused', 'Refused', 2, 1, 'error')
                ]}
                edges={[edge('placed', 'paid'), edge('paid', 'packed', 'yes'), edge('packed', 'sent'), edge('paid', 'refused', 'no')]}
            />
        )
    },
    {
        id: 'tree',
        icon: 'FiFolder',
        chip: 'Plan a structure',
        prompt: 'Lay out the folders for a small company website.',
        reply: 'Pages live in one folder, shared pieces in another, and pictures stay out of the code.',
        render: () => (
            <TreeView
                size="sm"
                data={{
                    website: {
                        label: 'website',
                        children: {
                            pages: { label: 'pages', children: { 'home.html': { label: 'home.html', children: {} }, 'about.html': { label: 'about.html', children: {} }, 'contact.html': { label: 'contact.html', children: {} } } },
                            parts: { label: 'parts', children: { 'header.html': { label: 'header.html', children: {} }, 'footer.html': { label: 'footer.html', children: {} } } },
                            images: { label: 'images', children: {} },
                            'styles.css': { label: 'styles.css', children: {} }
                        }
                    }
                }}
            />
        )
    },
    {
        id: 'status',
        icon: 'FiBarChart2',
        chip: 'Track progress',
        prompt: 'Show where the spring launch stands as a small dashboard.',
        reply: 'Design is done, the site is most of the way there, and testing has only just started.',
        render: () => (
            <Container layout="grid" columns={3} gap="sm" padding="none" width="100%">
                {[['Design', 100, 'success', 'Done'], ['Website', 70, 'primary', 'On track'], ['Testing', 15, 'warning', 'Just started']].map(([title, value, color, state]) => (
                    <Card key={title} layout="flex-column" gap="xs" padding="sm" hover={false} shadow={false} minWidth="0">
                        <Container layout="flex" justify="between" align="center" padding="none" width="100%" wrap={false}>
                            <Typography size="xs" weight="semibold">{title}</Typography>
                            <Badge size="xs" color={color}>{state}</Badge>
                        </Container>
                        <Typography size="xl" weight="bold" font="monospace">{value}%</Typography>
                        <ProgressBar value={value} size="sm" color={color} width="100%" />
                    </Card>
                ))}
            </Container>
        )
    }
];

const PITCH = [
    { text: 'Chat with AI models that run on your own hardware.' },
    { text: 'Attach a PDF, Word document or spreadsheet and ask about it.' },
    { text: 'Turn on web search and get answers with their sources.' },
    { text: 'Get tables, charts and diagrams back, not only text.' },
    { text: 'Use a mixture of expert models on one project, across several machines.' },
    { text: 'Models lay out answers with the App Base components. Open the component library.', link: { text: 'component library', href: 'https://base.eccco.space/components' } }
];

const ACCENTS = ['primary', 'secondary', 'tertiary', 'success', 'warning'];

const PROOF = [
    { icon: 'FiLock', title: 'Stays on this computer', text: 'Replies are written by a model running on your own hardware, not by a cloud service.' },
    { icon: 'FiBox', title: 'Any Ollama model', text: 'Download from a list that marks which models fit your graphics card and memory.' },
    { icon: 'FiHardDrive', title: 'Your files, one account', text: 'The same sign-in opens your FilesystemOne files, so you can attach them to a chat.' }
];

const BENTO = [
    { icon: 'FiMessageSquare', title: 'Chat that keeps going', text: 'Close the tab and the reply carries on. Queue the next question while one is being written. Dictate instead of typing.', span: 2 },
    { icon: 'FiSliders', title: 'Shows which models fit', text: 'Every model is checked against your graphics card and memory before you download it.' },
    { icon: 'FiFileText', title: 'Answers from your documents', text: 'Attach a PDF, Word document or spreadsheet, or pick one from FilesystemOne. A model only sees the files you attach.' },
    { icon: 'FiSearch', title: 'Web search with checked links', text: 'Mollama opens each page a search finds and test-loads each file, and a model may only show the ones that worked.' },
    { icon: 'FiUser', title: 'Your own versions of a model', text: 'Save an installed model under a new name with your instructions and a creativity level, and edit them whenever you like.' }
];

const STEPS = [
    ['Install Ollama', 'One installer. Mollama finds it by itself.'],
    ['Pick a model', 'Choose from the ones that fit and press Download.'],
    ['Ask', 'Open Chat and type. Nothing to configure first.']
];

const Band = ({ children, width = '1120px', ...rest }) => (
    <Container layout="flex" justify="center" padding="none" width="100%" wrap={false} {...rest}>
        <Container layout="flex-column" gap="md" padding="lg" width="100%" maxWidth={width} wrap={false}>{children}</Container>
    </Container>
);

const GRAPHICS_CARDS = [
    { value: 'none', label: 'No graphics card', gb: 0 },
    { value: '4', label: '4 GB card (GTX 1650, RTX 3050 4GB)', gb: 4 },
    { value: '6', label: '6 GB card (RTX 2060, RTX 3050 6GB)', gb: 6 },
    { value: '8', label: '8 GB card (RTX 3060 Ti, 4060, 4060 Ti, RX 7600)', gb: 8 },
    { value: '12', label: '12 GB card (RTX 3060, 4070, RX 7700 XT)', gb: 12 },
    { value: '16', label: '16 GB card (RTX 4060 Ti 16GB, 4080, RX 7800 XT)', gb: 16 },
    { value: '24', label: '24 GB card (RTX 3090, 4090, RX 7900 XTX)', gb: 24 },
    { value: '32', label: '32 GB card (RTX 5090)', gb: 32 },
    { value: 'other', label: 'Another card: I will type its memory', gb: null }
];
const VERDICT_COLORS = { gpu: 'success', mixed: 'warning', cpu: 'warning', too_large: 'error' };
const PICKS = { fast: 'Fastest', balanced: 'Best balance', best: 'Best quality' };
const gbText = (megabytes) => `${(megabytes / 1024) >= 10 ? Math.round(megabytes / 1024) : Number((megabytes / 1024).toFixed(1))} GB`;
const speedText = (range) => (range ? `about ${range[0]} to ${range[1]} tokens a second` : null);

const HELP = [
    {
        system: 'Windows',
        steps: [
            { label: 'System memory, in PowerShell', code: '[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)' },
            { label: 'Graphics memory on an NVIDIA card, in PowerShell', code: 'nvidia-smi --query-gpu=name,memory.total --format=csv' },
            { label: 'Any graphics card: open Task Manager, then Performance, then GPU, and read "Dedicated GPU memory".' }
        ],
        warning: 'Windows lists (dxdiag, wmic, Device Manager) often show 4 GB for cards that have more. Trust Task Manager or nvidia-smi.'
    },
    {
        system: 'macOS',
        steps: [
            { label: 'System memory, in Terminal', code: 'system_profiler SPHardwareDataType | grep Memory' },
            { label: 'Apple silicon: the graphics chip shares system memory. Choose "Another card" and enter about two thirds of your memory.' }
        ]
    },
    {
        system: 'Linux',
        steps: [
            { label: 'System memory, in a terminal', code: "free -g | awk '/Mem:/ {print $2}'" },
            { label: 'Graphics memory on an NVIDIA card', code: 'nvidia-smi --query-gpu=name,memory.total --format=csv' },
            { label: 'Other graphics cards', code: 'lspci | grep -i vga' }
        ]
    }
];

const SpecHelp = () => (
    <Container layout="flex-column" gap="sm" padding="md" width="680px" maxWidth="92vw" backgroundColor="background" wrap={false}>
        {HELP.map((entry) => (
            <Container key={entry.system} layout="flex-column" gap="xs" padding="none" width="100%" wrap={false}>
                <Typography size="xs" weight="semibold" color="secondary">{entry.system}</Typography>
                {entry.steps.map((step) => (
                    <Container key={step.label} layout="flex-column" gap="none" padding="none" width="100%" wrap={false}>
                        <Typography size="xxs">{step.label}</Typography>
                        {step.code && (
                            <Card layout="flex" align="center" justify="between" gap="sm" padding="xs" width="100%" hover={false} shadow={false} bordered={false} backgroundColor="surface" wrap={false}>
                                <Container padding="none" flexFill minWidth="0">
                                    <Typography size="xxs" font="monospace">{step.code}</Typography>
                                </Container>
                                <CopyButton text={step.code} />
                            </Card>
                        )}
                    </Container>
                ))}
                {entry.warning && (
                    <Container layout="flex" align="start" gap="xs" padding="none" wrap={false}>
                        <Icon name="FiAlertTriangle" size="xs" color="warning" />
                        <Typography size="xxs" color="warning">{entry.warning}</Typography>
                    </Container>
                )}
            </Container>
        ))}
    </Container>
);

const SectionHead = ({ title, children, reverse = false }) => {
    const heading = <Typography key="title" as="h2" size="lg" weight="bold" font="secondary" color="header" animation="shiny" animationDuration={4000}>{title}</Typography>;
    const text = (
        <Container key="text" padding="none" maxWidth="460px">
            <Typography size="sm" color="muted">{children}</Typography>
        </Container>
    );
    return (
        <Container layout="flex" align="end" justify="between" gap="md" padding="none" width="100%">
            {reverse ? [text, heading] : [heading, text]}
        </Container>
    );
};

const Calculator = ({ user }) => {
    const { error: notifyError } = useNotification();
    const activity = useActivity();
    const [memory, setMemory] = useState('');
    const [card, setCard] = useState('8');
    const [cardMemory, setCardMemory] = useState('');
    const [result, setResult] = useState(null);
    const [problem, setProblem] = useState(null);
    const [busy, setBusy] = useState(false);
    const [mine, setMine] = useState(null);

    const clear = () => {
        setMemory('');
        setCard('8');
        setCardMemory('');
        setResult(null);
        setProblem(null);
    };

    const check = useCallback(async (memoryGb, graphicsGb) => {
        if (!Number.isFinite(memoryGb) || memoryGb < 1 || memoryGb > 2048) {
            setProblem('Enter system memory as a number of gigabytes from 1 to 2048, for example 16.');
            return;
        }
        if (!Number.isFinite(graphicsGb) || graphicsGb < 0 || graphicsGb > 512) {
            setProblem('Enter graphics memory as a number of gigabytes from 0 to 512, for example 8. Use 0 for no graphics card.');
            return;
        }
        setProblem(null);
        setBusy(true);
        try {
            setResult(await modelService.getPublicCatalogue(Math.round(memoryGb * 1024), Math.round(graphicsGb * 1024)));
        } catch (error) {
            setProblem(describeError(error, 'The list could not be worked out. Try again.'));
        } finally {
            setBusy(false);
        }
    }, []);

    const loadMine = useCallback(async () => {
        try {
            const [devices, installed] = await Promise.all([deviceService.listDevices(), modelService.listInstalled()]);
            const hardware = devices.devices[0]?.hardware;
            setMine({
                device: devices.devices[0]?.name,
                installed: new Set(installed.models.map((model) => model.name)),
                canManage: Boolean(installed.permissions?.manage)
            });
            return hardware;
        } catch {
            return null;
        }
    }, []);

    useEffect(() => {
        if (!user) {
            setMine(null);
            return;
        }
        loadMine().then((hardware) => {
            if (!hardware?.memoryMb) return;
            const memoryGb = Math.round(hardware.memoryMb / 1024);
            const graphicsGb = hardware.hasGpu ? Math.round((hardware.gpuMemoryMb / 1024) * 10) / 10 : 0;
            const known = GRAPHICS_CARDS.find((option) => option.gb === graphicsGb);
            setMemory(String(memoryGb));
            setCard(known ? known.value : 'other');
            setCardMemory(known ? '' : String(graphicsGb));
            check(memoryGb, graphicsGb);
        });
    }, [user, loadMine, check]);

    const submit = () => {
        const chosen = GRAPHICS_CARDS.find((option) => option.value === card);
        check(Number(memory), chosen.gb === null ? Number(cardMemory) : chosen.gb);
    };

    const download = async (tag) => {
        try {
            await modelService.startDownload(tag);
            activity.refresh();
        } catch (error) {
            notifyError(describeError(error, 'The download could not be started.'));
        }
    };

    const fitting = result ? result.models.filter((model) => model.fit.fits) : [];
    const tooLarge = result ? result.models.filter((model) => !model.fit.fits) : [];
    const reserved = result?.reserved || { gpuMemoryMb: 1536, memoryMb: 4096 };

    const modelCard = (model) => {
        const downloading = activity.downloads.some((job) => job.model === model.tag);
        const installed = mine?.installed.has(model.tag);
        return (
            <Card key={model.tag} layout="flex-column" gap="xs" padding="md" width="100%" height="100%" minWidth="0" shadow={false} wrap={false}>
                <Container layout="flex" justify="between" align="center" gap="sm" padding="none" width="100%" wrap={false}>
                    <Typography as="h3" size="sm" weight="semibold" truncate>{model.name}</Typography>
                    {model.pick && <Badge size="xs" color="primary">{PICKS[model.pick]}</Badge>}
                </Container>
                <Typography size="xs" color="muted">{model.description}</Typography>
                <Container padding="none" flexFill />
                <Container layout="flex" align="center" gap="xs" padding="none">
                    <Badge size="xs" color={VERDICT_COLORS[model.fit.verdict]}>{model.fit.label}</Badge>
                    {model.moe && <Badge size="xs" color="secondary">Mixture of experts</Badge>}
                </Container>
                <Container layout="flex" justify="between" align="center" gap="sm" padding="none" width="100%" wrap={false}>
                    <Container padding="none" flexFill minWidth="0">
                        <Typography size="xxs" color="muted" truncate>
                            {[`${gbText(model.sizeMb)} download`, `needs ${gbText(model.fit.memoryNeededMb)}`, speedText(model.fit.tokensPerSecond)].filter(Boolean).join(' · ')}
                        </Typography>
                    </Container>
                    {mine && installed && <Badge size="xs" color="success">Installed</Badge>}
                    {mine && !installed && downloading && <Badge size="xs" color="primary">Downloading</Badge>}
                    {mine?.canManage && !installed && !downloading && model.fit.fits && (
                        <Button size="xs" onClick={() => download(model.tag)}><Icon name="FiDownload" size="xs" />Download</Button>
                    )}
                </Container>
            </Card>
        );
    };

    return (
        <Container layout="flex-column" gap="md" padding="none" width="100%">
            <SectionHead title="Check your computer">
                {mine?.device
                    ? `Filled in from ${mine.device}. Change the numbers to try another machine.`
                    : 'Enter two numbers to see which AI models your computer can run, how fast they would be, and why. No account needed.'}
            </SectionHead>

            <Card layout="flex-column" gap="sm" padding="md" width="100%" hover={false}>
                <Container layout="grid" columns="auto" gap="sm" padding="none" width="100%" align="end">
                    <Input size="sm" label="System memory (GB)" placeholder="16" value={memory} onChange={(event) => setMemory(event.target.value)} width="100%" />
                    <Select size="sm" label="Graphics card" options={GRAPHICS_CARDS.map(({ value, label }) => ({ value, label }))} value={card} onChange={setCard} width="100%" />
                    {card === 'other' && (
                        <Input size="sm" label="Graphics memory (GB)" placeholder="10" value={cardMemory} onChange={(event) => setCardMemory(event.target.value)} width="100%" />
                    )}
                </Container>
                <Container layout="flex" align="center" justify="between" gap="sm" padding="none" width="100%">
                    <Button size="xs" variant="ghost" genie={{ content: <SpecHelp />, trigger: 'click', padding: 'none', backgroundColor: 'background' }}>
                        <Icon name="FiHelpCircle" size="xs" />Where do I find these?
                    </Button>
                    <Container layout="flex" align="center" gap="xs" padding="none" wrap={false}>
                        <Button size="sm" variant="ghost" title="Clear" aria-label="Clear" disabled={busy || (!memory && !cardMemory && !result && !problem)} onClick={clear}>
                            <Icon name="FiX" size="xs" />
                        </Button>
                        <Button size="sm" color="primary" disabled={busy || !memory.trim()} onClick={submit}>
                            <Icon name="FiCpu" size="xs" />{busy ? 'Working it out…' : 'Show what fits'}
                        </Button>
                    </Container>
                </Container>
                {problem && <Typography size="xs" color="error">{problem}</Typography>}
            </Card>

            {result && (
                <>
                    {result.notes.length > 0 && (
                        <Container layout="flex-column" gap="xs" padding="none" width="100%">
                            {result.notes.map((note) => (
                                <Container key={note} layout="flex" align="start" gap="xs" padding="none" wrap={false}>
                                    <Icon name="FiInfo" size="xs" color="primary" />
                                    <Typography size="xs">{note}</Typography>
                                </Container>
                            ))}
                        </Container>
                    )}
                    <Typography size="xs" weight="semibold">{fitting.length} of {result.models.length} listed models fit {gbText(result.hardware.memoryMb)} of memory{result.hardware.gpuMemoryMb ? ` and a ${gbText(result.hardware.gpuMemoryMb)} graphics card` : ' with no graphics card'}</Typography>
                    <Container layout="grid" columns="auto-lg" gap="sm" padding="none" width="100%" align="stretch">{fitting.map(modelCard)}</Container>
                    {tooLarge.length > 0 && (
                        <>
                            <Typography size="xs" weight="semibold" color="muted">Too large for this machine</Typography>
                            <Container layout="grid" columns="auto-lg" gap="sm" padding="none" width="100%" align="stretch">{tooLarge.map(modelCard)}</Container>
                        </>
                    )}
                    {!user && (
                        <Container layout="flex" align="center" justify="between" gap="sm" padding="none" width="100%">
                            <Typography size="xs" color="muted">Sign in on the machine itself and Mollama reads these numbers for you and downloads with one button.</Typography>
                        </Container>
                    )}
                </>
            )}

            <Container layout="grid" columns={3} gap="sm" padding="none" width="100%">
                <Card layout="flex-column" gap="xs" padding="md" minWidth="0" shadow={false} hover={false} wrap={false}>
                    <Icon name="FiLayers" size="sm" color="primary" />
                    <Typography size="sm" weight="semibold">Why a 30B model can run on an 8 GB card</Typography>
                    <Typography size="xs" color="muted">
                        Some large models are a team of specialists and only a few work on each word. The whole team still has to be held in memory,
                        so whatever does not fit on the graphics card sits in system memory. For these models, system memory matters as much as graphics memory.
                    </Typography>
                </Card>
                <Card layout="flex-column" gap="xs" padding="md" minWidth="0" shadow={false} hover={false} wrap={false}>
                    <Icon name="FiShield" size="sm" color="primary" />
                    <Typography size="sm" weight="semibold">Room left for everything else</Typography>
                    <Typography size="xs" color="muted">
                        A model only counts as fitting in what is left after {gbText(reserved.gpuMemoryMb)} of graphics memory is kept for your screen and other apps,
                        and {gbText(reserved.memoryMb)} of system memory for the rest of the computer.
                    </Typography>
                </Card>
                <Card layout="flex-column" gap="xs" padding="md" minWidth="0" shadow={false} hover={false} wrap={false}>
                    <Icon name="FiSliders" size="sm" color="primary" />
                    <Typography size="sm" weight="semibold">The quality level shown</Typography>
                    <Typography size="xs" color="muted">
                        Every model is listed at the standard version Ollama downloads: packed to about a quarter of its full size with little loss in quality.
                        Higher-quality versions exist and need more memory than shown here.
                    </Typography>
                </Card>
            </Container>
        </Container>
    );
};

const HomePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [demo, setDemo] = useState(DEMOS[0]);
    const [pitch, setPitch] = useState(0);
    const [prompt, setPrompt] = useState(DEMOS[0].prompt);
    const start = user ? '/chat' : '/signup';

    const choose = (item) => {
        setDemo(item);
        setPrompt(item.prompt);
    };
    const send = () => {
        try {
            sessionStorage.setItem(FIRST_PROMPT_KEY, prompt.trim());
        } catch {
            return navigate(start);
        }
        return navigate(start);
    };

    return (
        <Page layout="block" padding="none" background="grid" backgroundSize="lg" backgroundFade="bottom">
            <Band>
                <Container layout="flex" align="center" justify="between" gap="sm" padding="none" width="100%" wrap={false}>
                    <Container layout="flex" align="center" gap="xs" padding="none" wrap={false}>
                        <Icon name="FiCpu" size="md" color="primary" />
                        <Typography size="md" weight="bold" font="secondary">Mollama</Typography>
                    </Container>
                    <Container layout="flex" align="center" gap="xs" padding="none" wrap={false}>
                        {!user && <Button size="sm" variant="ghost" onClick={() => navigate('/login')}>Sign in</Button>}
                        {user && <Button size="sm" variant="ghost" onClick={() => navigate('/dashboard')}>Dashboard</Button>}
                        <Button size="sm" color="primary" onClick={() => navigate(start)}>{user ? 'Open chat' : 'Get started'}</Button>
                    </Container>
                </Container>
            </Band>

            <Band width="820px">
                <Container layout="flex-column" align="center" gap="sm" padding="none" width="100%" marginTop="lg">
                    <Badge color="secondary" size="sm">Local AI, no command line</Badge>
                    <Typography as="h1" size="3xl" weight="extrabold" font="secondary">
                        Ask your own computer,{' '}
                        <Typography as="span" size="3xl" weight="extrabold" font="secondary" color="primary" animation="gradient" animationDuration={5000}>all your computers.</Typography>
                    </Typography>
                    <Container layout="flex" justify="start" align="center" padding="none" width="100%" minHeight="3.5rem">
                        <Typography
                            key={pitch}
                            size="md"
                            color="muted"
                            animation="typewriter"
                            animationConfig={{ typingSpeed: 55, deletingSpeed: 25, pauseDuration: 2600, reserveSpace: false, link: PITCH[pitch].link || null }}
                            onAnimationComplete={() => setPitch((now) => (now + 1) % PITCH.length)}
                        >
                            {PITCH[pitch].text}
                        </Typography>
                    </Container>
                </Container>

                <Card layout="flex-column" gap="sm" padding="md" width="100%" hover={false} borderColor="primary" marginTop="md">
                    <Input
                        multiline
                        rows={2}
                        size="md"
                        variant="underline"
                        backgroundColor="transparent"
                        width="100%"
                        placeholder="Ask anything…"
                        aria-label="Try a first question"
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                    />
                    <Container layout="flex" align="center" justify="between" gap="sm" padding="none" width="100%">
                        <Container layout="flex" gap="xs" padding="none">
                            {DEMOS.map((item) => (
                                <Button key={item.id} size="xs" variant="ghost" selected={demo.id === item.id} onClick={() => choose(item)}>
                                    <Icon name={item.icon} size="xs" />{item.chip}
                                </Button>
                            ))}
                        </Container>
                        <Button size="sm" color="primary" disabled={!prompt.trim()} onClick={send}>
                            {user ? 'Ask in chat' : 'Create an account to ask'}<Icon name="FiArrowRight" size="xs" />
                        </Button>
                    </Container>
                </Card>
                <Typography size="xxs" color="muted">Pick an example to see an answer a model laid out as a table, diagram or chart. Sending opens your question in Chat.</Typography>

                <Card layout="flex-column" gap="sm" padding="md" width="100%" hover={false} backgroundColor="background">
                    <Container layout="flex" align="center" justify="between" gap="sm" padding="none" width="100%" wrap={false}>
                        <Container layout="flex" align="center" gap="xs" padding="none" wrap={false}>
                            <Icon name="FiCpu" size="xs" color="primary" />
                            <Typography size="xs" weight="semibold">What the answer looks like</Typography>
                        </Container>
                        <Badge size="xs" color="success">Drawn by the model</Badge>
                    </Container>
                    <Typography key={demo.id} size="sm" animation="fade" animationDuration={500}>{demo.reply}</Typography>
                    <Container key={`${demo.id}-view`} padding="none" width="100%">{demo.render()}</Container>
                </Card>
            </Band>

            <Band>
                <Container layout="grid" columns="auto" gap="md" padding="none" width="100%" marginTop="lg">
                    {PROOF.map((item, index) => (
                        <Container key={item.title} layout="flex" align="start" gap="sm" padding="none" wrap={false}>
                            <Icon name={item.icon} size="sm" color={ACCENTS[index % ACCENTS.length]} />
                            <Container layout="flex-column" gap="none" padding="none">
                                <Typography size="sm" weight="semibold">{item.title}</Typography>
                                <Typography size="xs" color="muted">{item.text}</Typography>
                            </Container>
                        </Container>
                    ))}
                </Container>
                <Divider margin="sm" />
            </Band>

            <Band>
                <Calculator user={user} />
                <Divider margin="sm" />
            </Band>

            <Band>
                <SectionHead reverse title="Built for real work, not demos">Everything a local model needs to be useful, in one app you run yourself.</SectionHead>
                <Container layout="grid" columns={3} gap="sm" padding="none" width="100%">
                    {BENTO.map((item, index) => (
                        <Card key={item.title} layout="flex-column" gap="xs" padding="md" span={item.span || null} minWidth="0" shadow={false} wrap={false} background={item.span ? 'dots' : null} backgroundFade="left">
                            <Icon name={item.icon} size="sm" color={ACCENTS[index % ACCENTS.length]} />
                            <Typography size="sm" weight="semibold">{item.title}</Typography>
                            <Typography size="xs" color="muted">{item.text}</Typography>
                        </Card>
                    ))}
                </Container>
            </Band>

            <Band>
                <Divider margin="sm" />
                <SectionHead title="Start in three steps">From nothing installed to your first answer, without touching a command line.</SectionHead>
                <Container layout="grid" columns="auto" gap="md" padding="none" width="100%">
                    {STEPS.map(([title, text], index) => (
                        <Container key={title} layout="flex" align="start" gap="sm" padding="none" wrap={false}>
                            <Typography size="2xl" weight="bold" color={ACCENTS[index % ACCENTS.length]} font="monospace">{index + 1}</Typography>
                            <Container layout="flex-column" gap="none" padding="none">
                                <Typography size="sm" weight="semibold">{title}</Typography>
                                <Typography size="xs" color="muted">{text}</Typography>
                            </Container>
                        </Container>
                    ))}
                </Container>
                <Divider margin="sm" />
                <Container layout="flex" align="center" justify="between" gap="md" padding="none" width="100%">
                    <Typography size="xs" color="muted">Mollama. Local AI that stays on the machine it runs on.</Typography>
                    <Button size="sm" color="primary" onClick={() => navigate(start)}>
                        {user ? 'Open chat' : 'Get started'}<Icon name="FiArrowRight" size="xs" />
                    </Button>
                </Container>
            </Band>
        </Page>
    );
};

export default HomePage;
