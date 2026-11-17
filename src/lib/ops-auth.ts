import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const getOpsUser = async () => {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { internalRole: true },
    });

    if (user?.internalRole !== "OPS") {
        return null;
    }

    return { userId };
};
